import toast from "react-hot-toast";
import { redirect } from "react-router-dom";
export const sendRequest=async (email)=>{
    let res=await fetch('http://localhost:3000/user/sendRequest',{
        credentials:'include',
        method:'POST',
        headers:{
            "Content-type":"application/json",
        },
        body:JSON.stringify({
            email:email
        })
    });
    let data=await res.json();

    if(res.status==200) {
        toast.success(data.message);
        return ;
    }
    else {
        toast.error(data.message);
        return ;
    }
}

export const findRequests=async ()=>{
    let res=await fetch('http://localhost:3000/user/fetchRequests',{
        credentials:'include',
        method:'GET',
        headers:{
            "Content-type":"application/json"
        }
    })
    let data=await res.json();
    if(res.status==500) {
        toast.error(data.message);
        return {requests:[],sentReq:[]}; 
    }
    return data;
}

export const findUser=async (query)=>{
    let res=await fetch(`http://localhost:3000/user/find/${query}`,{
        method:'GET',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        }
    })
    let data=await res.json();
    if(res.status==401 || data.message =="Unauthorized") {
        redirect('/auth');
    }
    if(res.status==500) {
        toast.error(data.message);
        return ;
    }
    return data;
}

export const acceptUser=async (email)=>{
    let res=await fetch(`http://localhost:3000/user/acceptRequest/${email}`,{
        method:'POST',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        }
    });
    let data=await res.json();
    if(res.status==200) {
        declineRequest(email);
        return true;
    }
    return false;
}

export const declineRequest=async (email)=> {
    let res=await fetch(`http://localhost:3000/user/declineRequest/${email}`,{
        method:'DELETE',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        }
    });
    let data=await res.json();

    if(res.status==200) return true;
    return false;
    
}

export const cancelRequest=async (email)=>{
    let res=await fetch(`http://localhost:3000/user/cancelRequest/${email}`,{
        method:'DELETE',
        credentials:'include',
        headers:{
            "Content-type":"application/json"
        }
    });
    if(res.status==200) {
        return true;
    }
    return false;
}