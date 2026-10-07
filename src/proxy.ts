
import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"

// Proxy files always run on Node.js runtime — no runtime export needed

export async function proxy(req:NextRequest){

    const {pathname}=req.nextUrl
   
    const publicRoutes=["/login","/register","/api/auth","/unauthorized"]
     if(publicRoutes.some((path)=>pathname.startsWith(path))){
        return NextResponse.next()
     }
const session=await auth()

if(!session){
  const loginUrl=new URL("/login",req.url)
   loginUrl.searchParams.set("callbackUrl",req.url)
   return NextResponse.redirect(loginUrl)
}

const role=session.user?.role

// Only apply role checks to role-specific route prefixes
if(pathname.startsWith("/user") && role!=="user"){
  return NextResponse.redirect(new URL("/unauthorized",req.url))
}
if(pathname.startsWith("/delivery") && role!=="deliveryBoy"){
  return NextResponse.redirect(new URL("/unauthorized",req.url))
}
if(pathname.startsWith("/admin") && role!=="admin"){
  return NextResponse.redirect(new URL("/unauthorized",req.url))
}


return NextResponse.next()

}

// matcher config belongs in proxy.ts (not in middleware.ts)
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}


// req------middleware------server