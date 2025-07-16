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

export const updateProfile=async ()=>{

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
}

export const getToken=()=>{
    let token=localStorage.getItem("accessToken");
    return token;
}
