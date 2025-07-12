import express, { urlencoded } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js';
import { profile,updateProfile,
    getContacts,fetchFor,
    sendRequest, fetchRequests , acceptRequest,deleteRequest} from '../controllers/userController.js';


const router=express.Router();
router.use(express.urlencoded({extended:true}));

router.get('/profile',authMiddleware,profile);
router.patch('/updateProfile',authMiddleware,updateProfile);

router.get('/contacts',authMiddleware,getContacts);
router.get('/find/:id',authMiddleware,fetchFor);

router.get('/fetchRequests',authMiddleware,fetchRequests);
router.post('/sendRequest',authMiddleware,sendRequest);
router.post('/acceptRequest/:id',authMiddleware,acceptRequest); 
router.delete('/declineRequest/:id',authMiddleware,deleteRequest); 

export default router