// PREVIEW BUILD ONLY. Production Vite config never aliases the real AuthContext.
// No PocketBase account, token, password or production request is used here.
import {createContext,useContext,useState} from 'react';
const Context=createContext(null);
const account={id:'local-anatomy-preview',name:'Preview lokal',role:'preview',unreadNotifications:0,drillingAvailable:false};
export function AuthProvider({children}){
 const [me,setMe]=useState(new URLSearchParams(location.search).has('guest')?null:account);
 const value={me,setMe,ready:true,settings:{showMascots:false},isAdmin:false,refresh:async()=>me,refreshSettings:async()=>{},logout:()=>setMe(null),login:async()=>{setMe(account);return account;}};
 return <Context.Provider value={value}><div role="note" style={{position:'fixed',bottom:4,right:8,zIndex:10000,fontSize:10,padding:'3px 8px',borderRadius:8,color:'#00584e',background:'#e3f1ee',pointerEvents:'none'}}>Preview lokal · akun contoh</div>{children}</Context.Provider>;
}
export function useAuth(){return useContext(Context);}
