var func = {};
var jimp = require('jimp');
const config = require('./config.json');
var AWS = require('aws-sdk');

var s3 = new AWS.S3(config.S3);
const rekognition = new AWS.Rekognition(config.rekognition)


func.img = function(){
	var data = {};
	var st = new Date().getTime();



	var imgName = 'mo.jpg';

	getS3img(imgName)
	.then((img)=>{
		data.img = img;
		return detectAllFaces(imgName);
	})
	.then((imgFaces)=>{
		data.faces = imgFaces;
		return splitFaces(data.img.data, imgFaces.data, 'm');
	})
	.then((facesRaw)=>{
		data.facesRaw = facesRaw;
		console.log('Prom-done- '+ ((st - (new Date().getTime()))/1000 ) );

	});
}




function getS3img(s3img){

	return new Promise(function(resolve, reject){
		s3.getObject({ Bucket: config.S3.Bucket, Key: s3img },
		function (error, data) {
			if (error != null) {
				reject({status:'err', err:  error});
			} else { 
				resolve({status:'success', data: data.Body});

			}
		}//end func
	)});//end get obj

}

function detectAllFaces(img){
	var params = {
		Image: {
			S3Object: {
			Bucket: "rekimagesmarius", 
			Name: img
			}
		},
		Attributes: ["DEFAULT"]
	};

	return new Promise(function(resolve, reject){
		rekognition.detectFaces(params, function(err, data) {
			if (err){ 
				reject({status:'error', err: err.stack});
			}else{
				resolve({status:'success', data:data});
			}

		})
	});

}

function splitFaces(img, faces, name){
	return new Promise (function(resolve, reject){
		new jimp(img, (err, image)=>{
			var w = image.bitmap.width; 
			var h = image.bitmap.height;
			
			//var faces = allFaces.data.FaceDetails;
			var clone; //
			var promises = [];

			var facesUpload = [];
			var f = faces.FaceDetails;

			for(i = 0; i < f.length; i++ ){
				
				clone = image.clone().crop(w*f[i].BoundingBox.Left, h*f[i].BoundingBox.Top, w*f[i].BoundingBox.Width, h*f[i].BoundingBox.Height);
				promises.push(clone.getBuffer(jimp.MIME_JPEG, (err, data)=>{					
					var callback = function(error, data) { 
			            if (error) {
			                facesUpload.push({'status':'error', err:error});
			            } else {
			                facesUpload.push({'status':'success', data:data});
			            }
			        };

			        var imgName = 'faces/f'+i+'.' + 'img.' + name + '.' + (new Date).getTime()+'.jpg';
					s3.putObject({ Body: data, Key: imgName, Bucket: config.S3.Bucket}, callback);


				}));

			}


			Promise.all(promises)    
			.then(function(data){ 
				resolve({status:'success', data:facesUpload });

			})
			.catch(function(err){ 
				reject({status:'error', err: err});
			});



	/*
			var promises = []
			for( i=0; i < faces.length; i++ ){
				clone = image.clone().crop(w*faces[i].BoundingBox.Left, h*faces[i].BoundingBox.Top, w*faces[i].BoundingBox.Width, h*faces[i].BoundingBox.Height);
				promises.push(clone.getBuffer(jimp.MIME_JPEG, (err, data)=>{
					var callback = function(error, data) { 
			            if (error) {
			                console.log({'status':'error', err:error});
			            } else {
			                console.log({'status':'success', data:data});
			            }
			        };

			        var imgName = 'faces/f'+i+'.' + 'img.' + s3img + '.' + (new Date).getTime()+'.jpg';
					s3.putObject({ Body: data, Key: imgName, Bucket: config.S3.Bucket}, callback);
					
					//searchImage(imgName); //make this an async call

				}));//end adding promises

			}//end for loop

			Promise.all(promises)    
			.then(function(data){ 
				console.log('done');

			})
			.catch(function(err){ 
				console.log({"status": "error", e:err});
			});
	*/

		})
	});




}






module.exports = func;




