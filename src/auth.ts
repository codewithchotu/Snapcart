import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"


import mongoose from "mongoose"
import { isSuperAdmin } from "./lib/roles"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // trustHost is required on Vercel / behind any reverse proxy so Auth.js
  // trusts the x-forwarded-host header for URL resolution.
  trustHost: true,

  // Pin useSecureCookies in production (HTTPS) so PKCE code_verifier cookie
  // name is consistent, while allowing plain cookies in local development.
  useSecureCookies: process.env.NODE_ENV === "production",

  providers: [
    Credentials({
        credentials: {
        email: { label: "email",type:"email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      } ,
     async authorize(credentials) {
          try {
            await connectDb()
            const email = (credentials.email as string || "").toLowerCase().trim()
            const password = credentials.password as string
            const role = credentials.role as string | undefined

            const safeRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
            const query: any = { email: safeRegex }
            if (role) {
              query.role = role
            }

            let user = await User.findOne(query)

            // Fallback if requested role was not found directly
            if (!user && role) {
              user = await User.findOne({ email: safeRegex })
            }

            if (!user) {
                throw new Error("user does not exist")
            }
            if (!user.password) {
                throw new Error("this account uses Google sign-in")
            }
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                throw new Error("incorrect password")
            }

            const userRole = isSuperAdmin(user) ? "superAdmin" : user.role
            return {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: userRole
            }
          } catch (err: any) {
            console.error("[AUTH] Credentials authorize error:", err.message)
            throw err
          }
        }
    
    }),
    Google({
      clientId:process.env.GOOGLE_CLIENT_ID,
      clientSecret:process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks:{
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          await connectDb()
          const normalizedEmail = (user.email || "").toLowerCase().trim()
          const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
          let dbUser = await User.findOne({ email: safeRegex })
          if (!dbUser) {
            try {
              const Store = (await import("@/models/store.model")).default
              const matchingStores = await Store.find({ pendingAdminEmails: normalizedEmail })
              const assignedRole = isSuperAdmin({ email: normalizedEmail })
                ? "superAdmin"
                : matchingStores.length > 0 ? "admin" : "user"

              dbUser = await User.create({
                name: user.name || normalizedEmail.split('@')[0] || "User",
                email: normalizedEmail,
                image: user.image,
                role: assignedRole,
                managedStores: matchingStores.map(s => s._id)
              })

              if (matchingStores.length > 0) {
                for (const st of matchingStores) {
                  st.assignedAdmins = st.assignedAdmins || []
                  st.assignedAdmins.push(dbUser._id)
                  st.pendingAdminEmails = (st.pendingAdminEmails || []).filter((e: string) => e !== normalizedEmail)
                  await st.save()
                }
              }
            } catch (e: any) {
              // Handle duplicate-key race condition
              if (e.code === 11000) {
                dbUser = await User.findOne({ email: safeRegex })
              } else {
                console.error("[AUTH] Google signIn DB create error:", e.message)
                throw e
              }
            }
          } else if (isSuperAdmin({ email: normalizedEmail }) && dbUser.role !== "superAdmin") {
            // Keep DB role aligned with Super Admin identity
            dbUser.role = "superAdmin"
            await dbUser.save()
          }

          if (dbUser) {
            user.id = dbUser._id.toString()
            user.role = isSuperAdmin(dbUser) ? "superAdmin" : dbUser.role
          }
        }
        return true
      } catch (err: any) {
        console.error("[AUTH] signIn callback error:", err.message)
        // Returning false triggers /login?error=AccessDenied
        return false
      }
    },
    async jwt({ token, user, trigger, session }) {
        // On initial sign-in, user object is available — persist all fields
        if (user) {
            token.id = user.id
            token.name = user.name
            token.email = user.email
            token.role = user.role
        }
        // On session.update() call (e.g. after role selection or role switch)
        if (trigger === "update") {
          if (session?.role) {
            token.role = session.role
          }
          if (session?.id) {
            token.id = session.id
          }
        }

        const isValidMongoId = typeof token.id === "string" && mongoose.Types.ObjectId.isValid(token.id)
        const isSuper = isSuperAdmin({ email: token.email as string, role: token.role as string })

        // Fallback or Refresh: If token lacks valid MongoDB ObjectId, or missing role, or is Super Admin
        if (!isValidMongoId || !token.role || isSuper || trigger === "update") {
          try {
            await connectDb()
            const emailQuery = token.email ? (token.email as string).toLowerCase().trim() : ""
            if (emailQuery) {
              const safeRegex = new RegExp(`^${emailQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
              const dbUser = await User.findOne({ email: safeRegex })
              if (dbUser) {
                token.id = dbUser._id.toString()
                if (isSuperAdmin(dbUser) || isSuperAdmin({ email: emailQuery })) {
                  token.role = "superAdmin"
                  if (dbUser.role !== "superAdmin") {
                    dbUser.role = "superAdmin"
                    await dbUser.save()
                  }
                } else {
                  token.role = dbUser.role
                }
                if (!token.name) token.name = dbUser.name
              }
            }
          } catch (e) {
            console.error("[AUTH] JWT sync fallback error:", e)
          }
        }

        if (isSuper) {
          token.role = "superAdmin"
        }

        return token
    },
    session({ session, token }) {
        if (session.user) {
            session.user.id = (token.id as string) || (token.sub as string) || ""
            session.user.name = (token.name as string) || session.user.name || ""
            session.user.email = (token.email as string) || session.user.email || ""
            const isSuper = isSuperAdmin({ email: session.user.email, role: token.role as string })
            session.user.role = isSuper ? "superAdmin" : ((token.role as string) || "user")
        }
        return session
    },
  },
  pages:{
    signIn:"/login",
    error:"/login"
  },
  session:{
    strategy:"jwt",
    maxAge:10*24*60*60  // 10 days in seconds (not milliseconds)
  },
  secret:process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
})
