import toast from "react-hot-toast";
export const sendRequest=async (email)=>{

}

export const findUser=async (query)=>{
    let res=await fetch(`http://localhost:3000/user/find/${query}`,{
        method:'GET',
        headers:{
            "Content-type":"application/json"
        }
    })
    let data=await res.json();
    if(res.status==500) {
        toast.error(data.message);
        return ;
    }
    return data;
}
