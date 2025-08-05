// user profile fetching and updating

export const fetchProfile=async ()=>{
    let res=await fetch('http://localhost:3000/user/profile',{
        method:'GET',
        credentials:'include'
    });
    let data=await res.json();
    console.log(data);
    return data;
}

export const updatePassword=async (oldPassword,newPassword)=>{
    // work on this at last
}

export const updateName=async (newName)=>{
    let res=await fetch('http://localhost:3000/user/updateProfile',{
        method:'PATCH',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        },
        body:JSON.stringify({
            fullName:newName
        })
    });
    let data=await res.json();
    if(res.status==200) {
        return true;
    }
    return false;
}

export const updateProfile=async (url)=>{
    let res=await fetch("http://localhost:3000/user/updateProfile",{
        method:'PATCH',
        credentials:'include',
        headers:{
            "content-type":"application/json"
        },
        body:JSON.stringify({
            profilePic:url
        })
    });
    if(res.status==200) {
        return true;
    }
    return false;
}

export const getContacts=async ()=>{
    let res=await fetch('http://localhost:3000/user/contacts',{
        method:'GET',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        }
    });
    let data=await res.json();
    if(res.status==200) {
        return data.contacts;
    }
    return null;
}

export const getToken=()=>{
    let token=localStorage.getItem("accessToken");
    return token;
}

export const clearUnread = async(clearTo)=> {
    let res=await fetch(`http://localhost:3000/api/chat/clear/${clearTo}`,{
        method:'PATCH',
        credentials:'include',
        headers:{
            "content-type":"application/json"
        }
    });
    if(res.status==200) return true;
    return false;
}