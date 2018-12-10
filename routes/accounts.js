global.fetch = require('isomorphic-fetch');
global.navigator = { };
const cognito = require ('amazon-cognito-identity-js');
const config = require('../config.json');
var StellarSdk = require('stellar-sdk');
var express = require('express');
var router = express.Router();
var request = require('request');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

var ledgerServer = new StellarSdk.Server('https://ledger.chainledgergroup.com:20000');
StellarSdk.Network.use(new StellarSdk.Network('CLG Network ; Oct 2018'));

router.post('/create-keypair', (req, res)=>{
	var pair = StellarSdk.Keypair.random();
	var data = {};
	data.public = pair.publicKey();
	data.secret = pair.secret();

	ledgerServer.loadAccount("GBKZGBKJVTECZLUDZ3JYXL4VHRRVTTPFTCRLTGVGAREC5DUMZQI6NYKU")
  	.then(function(acct) { 
	  	var new_account = new StellarSdk.Account("GBKZGBKJVTECZLUDZ3JYXL4VHRRVTTPFTCRLTGVGAREC5DUMZQI6NYKU", acct.sequence);

		var transaction = new StellarSdk.TransactionBuilder(new_account)
		    .addOperation(StellarSdk.Operation.createAccount({
		      destination: pair.publicKey(),
		      startingBalance: "20"  // in Native
		    }))
		    .build();

		transaction.sign(StellarSdk.Keypair.fromSecret("SCOWXX2X7P26HRD64E63F7WRUVKLH23J7QQWQUKF24VACHHTKJREA4SE")); 
		transaction.toEnvelope().toXDR('base64');  
		return;
  	})
  	.then((trx)=>{
  		return ledgerServer.submitTransaction(trx);
  	})
  	.then((trxResult)=>{
        console.log(JSON.stringify(trxResult, null, 2));
  	})


	res.status(200).json(data);
})

router.post('/fund/:account', (req,res)=>{
	/*
{
    "secret": "SAKUCDZ4YQMZX3NTQM6IBSCI2T2VFVMW7J2OXRGCFPC6XCPZOW6WS2JQ",
    "public": "GCBTVEGMYLCZPC33Y5JHBKLMQ2SRFC3ZKU4EEUMAOODRLJKKJW2KRMH7"
}
	*/
	var sourceKeys = StellarSdk.Keypair.fromSecret('SAKUCDZ4YQMZX3NTQM6IBSCI2T2VFVMW7J2OXRGCFPC6XCPZOW6WS2JQ');


	ledgerServer.loadAccount(sourceKeys.publicKey())
	.then((sourceAccount)=>{
		console.log(sourceAccount);
	})

	

})




module.exports = router;
