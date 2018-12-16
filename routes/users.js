global.fetch = require('isomorphic-fetch');
global.navigator = { };
const cognito = require ('amazon-cognito-identity-js');
const config = require('../config.json');

var express = require('express');
var router = express.Router();

//AWS User Pool Informatio
const poolData = {
	UserPoolId: config.amazon.UserPoolId,
	ClientId : config.amazon.ClientId
}

const userPool = new cognito.CognitoUserPool(poolData);


router.get('/', function(req, res) {
	res.render('pages/index');
});

router.get('/signup', function(req, res) {
	res.render('pages/signup');
});

router.get('/admin', function(req, res) {
	res.render('pages/admin');
});

//PW check function
const getPasswordErrors = (req, source)=>{
	if (source == 'sign-up'){
		req.check('email', 'Invalid Email').isEmail();
	}
	req.check('password','Password must be at least 8 chars long').isLength({min: 8});
	req.check('password','Password does not match').equals(req.body['confirm_password']);
	req.check('password','Password does not contain special character').matches(/[$*.{}()?"!@#%&%/,><':;|_~`]/);
	req.check('password','Password does not contain number').matches(/[0-9]/);
	req.check('password','Password does not lower case').matches(/[a-z]/);
	req.check('password','Password does not upper case').matches(/[A-Z]/);
	
	return req.validationErrors();
}

router.post('/signup', function(req, res) {
	req.session['sign-up-errors']=[];
	const errors = getPasswordErrors(req, 'sign-up');

	if(errors){
		for(let error of errors){
			req.session['sign-up-errors'].push(error.msg);
		}
		console.log(req.session['sign-up-errors']);
		return res.redirect('/signup');
	}

	const emailData = {
		Name: 'email',
		Value: req.body.email
	}

	const emailAttributes = new cognito.CognitoUserAttribute(emailData);
	userPool.signUp(req.body.email, req.body.password, [emailAttributes], null, (err, data) => {
		if (err){
			return res.status(200).json({status:'error', err: err});
		}
		
		//return res.send({status:'success', data:data.user.username});
		return res.render("pages/verifyemail");

	});

});


router.post('/login', function(req, res) {
	const loginDetails = {
		Username : req.body.email,
		Password : req.body.password
	}

	const authDetails = new cognito.AuthenticationDetails(loginDetails);

	const userDetails = {
		Username : req.body.email,
		Pool : userPool
	}

	req.session['log-in-errors'] = [];
	const cognitoUser = new cognito.CognitoUser(userDetails);
	
	cognitoUser.authenticateUser(authDetails, {
		onSuccess: function(data) {
			req.session.sub = data.getIdToken().decodePayload().sub;
			//return res.redirect({status:'success', data: 'Logged in'});
			//return res.status(200).json({status:'Success', data: 'Logged In'});
			return res.render('pages/loggedin'); 

		}, //end success
		onFailure: function (err) {
			console.log(err.code);
			res.status(200).json({status:'error', err: err});
		}//end failure
	})//end auth user
	

});

router.post('/change-password', (req, res)=>{
	if(!req.session.sub){
		return res.redirect('/login');
	}

	const errors = getPasswordErrors(req);
	req.session['change-password-errors'] = []

	if(errors){
		for(let error of errors){
			req.session['change-password-errors'].push(error.msg);
		}
		console.log(req.session['change-password-errors']);
		return res.status(200).json({status: 'error', data:req.session['change-password-errors']});
	}

	const userDetails = {Username: req.session.sub, Pool: userPool}
	const cognitoUser = new cognito.CognitoUser(userDetails);

	cognitoUser.getSession((err, session)=>{
		if(err || !session.isValid){
			console.error(err.msg || JSON.stringify(err));
			return res.status(200).json({status: 'error', err: err});
		}
		cognitoUser.changePassword(req.body['old-password'], req.body.password, (err, data)=>{
			if(err){
				console.error(err.msg || JSON.stringify(err));
				return res.status(200).json({status: 'error', err: err});
			}
			res.status(200).json({status:'success', data: data});

		})

	})

})//end reset pass

//not needed
router.get('/reset-password', (req, res) => {
	res.redirect('reset-password.html');
});


router.post('/reset-password', (req, res)=>{
	req.session['reset-password-errors'] = []
	
	if(req.body.email){ // Send code to user to reset password
		const userDetails = {Username: req.body.email, Pool: userPool}
		const cognitoUser = new cognito.CognitoUser(userDetails);
		cognitoUser.forgotPassword({
			onSuccess: data =>{
				req.session['reset-password-email'] = req.body.email;
				req.session['reset-password-status'] = 'EmailSent';
				req.session['reset-password-message'] = 
				res.status(200).json({status:'success',msg: `Check your email at ${data.CodeDeliveryDetails.Destination}`});
			},
			onFailure: err => {
				console.error(err);
				req.session['reset-password-error'].push(err);
				res.redirect('/reset-password');
			}
		})
	
	}else{ //user has gotten code and now can reset their password
		const errors = getPasswordErrors(req);

		if(errors){
			for(let error of errors){
				req.session['reset-password-errors'].push(error.msg);
			}
			console.log(req.session['reset-password-errors']);
			return res.redirect('/reset-password');
		}

		const userDetails = {Username: req.session['reset-password-email'], Pool: userPool}
		const cognitoUser = new cognito.CognitoUser(userDetails);

		cognitoUser.confirmPassword(req.body.code, req.body.password,{
			onSuccess: data =>{
				res.redirect('/index.html');
			},
			onFailure: err =>{
				console.err(err);
				req.session['reset-password-errors'].push(err);
				return res.redirect('/reset-password');
			}
		});
	}//end if

})


module.exports = router;
