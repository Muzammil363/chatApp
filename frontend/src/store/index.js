import { createSlice,configureStore } from "@reduxjs/toolkit";

const authSlice=createSlice({
    name:'auth',
    initialState:{isAuthenticated:false,user:null,isChecking:true},
    reducers:{
        login(state, action) {
            state.isAuthenticated=true;
            state.user=action.payload?.user || state.user;
            state.isChecking=false;
        },
        logout(state) {
            state.isAuthenticated=false;
            state.user=null;
            state.isChecking=false;
        },
        finishChecking(state) {
            state.isChecking=false;
        }
    }
});

const themeSlice=createSlice({
    name:'theme',
    initialState:{theme:'light'},
    reducers:{
        toggleTheme(state) {
            if(state.theme==='light') {
                state.theme='dark'
            }
            else {
                state.theme='light';
            }
        }
    }
});

const secretSlcie=createSlice({
    name:'decryptionKey',
    initialState:{sharedSecret:''},
    reducers:{
        setSharedSecret(state,action) {
            state.sharedSecret=action.payload.sharedSecret;
        }
    }
});

const  privateKeySlice=createSlice({
    name:'privateKey',
    initialState:{key:null},
    reducers:{
        setPrivateKey(state,action) {
            state.key=action.payload.privateKey
        },
        clearPrivateKey(state) {
            state.key=null
        }
    }
});

const store=configureStore({
    reducer:{
        auth:authSlice.reducer,
        theme:themeSlice.reducer,
        secret:secretSlcie.reducer,
        privateKey:privateKeySlice.reducer
    }
})

export const authActions=authSlice.actions;
export const themeActions=themeSlice.actions;
export const decryptKeyActions=secretSlcie.actions;
export const privateKeyActions=privateKeySlice.actions;
export default store
