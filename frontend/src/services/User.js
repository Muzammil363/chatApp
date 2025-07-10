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

export const updatePassword=async ()=>{

}

export const updateName=async ()=>{

}

export const updateProfile=async ()=>{

}

export const getContacts=async ()=>{

}

export const getToken=()=>{
    let token=localStorage.getItem("accessToken");
    return token;
}
