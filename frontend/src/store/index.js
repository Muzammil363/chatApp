import { createSlice,configureStore } from "@reduxjs/toolkit";

const authSlice=createSlice({
    name:'auth',
    initialState:{isAuthenticated:false},
    reducers:{
        login(state) {
            state.isAuthenticated=true;
        },
        logout(state) {
            state.isAuthenticated=false;
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

const store=configureStore({
    reducer:{
        auth:authSlice.reducer,
        theme:themeSlice.reducer
    }
})

export const authActions=authSlice.actions;
export const themeActions=themeSlice.actions;
export default store