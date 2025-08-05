export const deleteContact=async (email)=> {
    let res=await fetch(`http://localhost:3000/user/contact/${email}`,{
        method:'DELETE',
        credentials:'include',
        headers:{
            "content-type":"application/json"
        }
    });
    if(res.status==200) return true;
    return false;
}

export const clearChat=async (email) => {
    let res=await fetch(`http://localhost:3000/api/chat/clearChat/${email}`,{
        method:'DELETE',
        credentials:'include',
        headers: {
            "content-type":"application/json"
        }
    })
    if(res.status==200) return true;
    return false;
}

export const deleteMessage=async (id)=>{
    console.log("id on frontend ",id);
    let res=await fetch(`http://localhost:3000/api/chat/deleteMessage/${id}`,{
        method:'DELETE',
        credentials:'include',
        headers:{
            "content-type":"application/json"
        }
    });
    if(res.status==200) return true;
    return false;
}