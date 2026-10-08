import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"


export const { handlers, signIn, signOut, auth } = NextAuth({
  // trustHost is required on Vercel / behind any reverse proxy so Auth.js
  // trusts the x-forwarded-host header for URL resolution.
  trustHost: true,

  // Explicitly pin useSecureCookies=true so the PKCE code_verifier cookie
  // name is always "__Secure-authjs.pkce.code_verifier" on both the signin
  // and callback requests. Without this, if url.protocol detection is
  // inconsistent between the two requests (a known issue on some Vercel
  // edge/proxy configurations), the cookie name changes → the JWT
  // decryption salt changes → "Invalid code verifier" from Google.
  useSecureCookies: true,

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
            return {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role
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
          let dbUser = await User.findOne({ email: normalizedEmail })
          if (!dbUser) {
            try {
              dbUser = await User.create({
                name: user.name,
                email: normalizedEmail,
                image: user.image,
              })
            } catch (e: any) {
              // Handle duplicate-key race condition
              if (e.code === 11000) {
                dbUser = await User.findOne({ email: normalizedEmail })
              } else {
                console.error("[AUTH] Google signIn DB create error:", e.message)
                throw e
              }
            }
          }
          user.id = dbUser._id.toString()
          user.role = dbUser.role
        }
        return true
      } catch (err: any) {
        console.error("[AUTH] signIn callback error:", err.message)
        // Returning false triggers /login?error=AccessDenied
        return false
      }
    },
    jwt({ token, user, trigger, session }) {
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
        return token
    },
    session({ session, token }) {
        if (session.user) {
            session.user.id = token.id as string
            session.user.name = token.name as string
            session.user.email = token.email as string
            // Ensure role is always a string; fall back to "user" only if truly missing
            session.user.role = (token.role as string) || "user"
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
  secret:process.env.AUTH_SECRET
})
