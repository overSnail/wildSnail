var express = require('express');
var router = express.Router();
var mysql = require('mysql') ;
var co = require('co');
var OSS = require('ali-oss');
var fs = require('fs');


var multer  = require('multer');

var client = new OSS({
  region: 'oss-cn-shanghai',
  accessKeyId: 'LTAI4NpbadMsra0X',
  accessKeySecret: 'tqizcANMSTyDEn70QrUOHoy5b5CNSq',
  bucket: 'wild',
  object: 'images',
});

var storge = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        var fileformat = (file.originalname).split('.');
        cb(null, file.fieldname+'-'+Date.now()+'.'+fileformat[fileformat.length-1]);
    }
})
var upload = multer({storage: storge});


 // 数据库链接参数设置
 var connection = mysql.createConnection({
   host : 'rm-uf61jkshc9u8xx987o.mysql.rds.aliyuncs.com',
   user : 'admin' ,
   password : '898011234',
   database: 'snail'
 });

connection.connect();


// 登陆
router.post("/weixin/login",function(req,res){
	var account = req.body.account;
	var password = req.body.password;
	var query = "SELECT * FROM user WHERE account = '" + req.body.account + "' And password = " + req.body.password;
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){

		if (err) {
			console.log(err);
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
		}else if (queryData[0] == undefined) {
			data.error = 1;
			data.desc = "登录失败";
			data.data = "";
		}
		else {
			if (queryData[0].account == account && queryData[0].password == password) {
				data.error = 0;
				data.desc = "登录成功";
				data.data = {
					userId: queryData[0].user_id
				}
			};
		};
		res.json(data);
	});
});
//获取用户基本信息
router.post("/weixin/userInfo",function(req,res){
	var userId = req.body.userId;
	var query = "SELECT * FROM user WHERE user_id = " + userId;
	var data = {
		error:"1",
		desc:"",
		data:""
	};

	connection.query(query,"",function(err,queryData){
		if (err) {
			console.log(err);
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
		}else if (queryData[0] == undefined) {
			data.error = 1;
			data.desc = "数据获取错误,请重新登录";
			data.data = "";
		}
		else {
			if (queryData[0].user_id == userId) {
				data.error = 0;
				data.desc = "success";
				data.data = {
					nickName: queryData[0].nick_name,
					power: queryData[0].power
				}
			};
		};
		res.json(data);
	});
});


router.options('/common/uploadImg',function(req,res){
	console.log("捕捉到options请求");
	res.send(200);
})
// 图片上传
router.post('/common/uploadImg', upload.array('file',20), function (req, res, next) {
  // req.body 将具有文本域数据, 如果存在的话

  co(function* () {
    // don't use 'chunked encoding'
    var stream = fs.createReadStream(req.files[0].path);

    var size = fs.statSync(req.files[0].path).size;
    var result = yield client.putStream(
      'images/' + req.files[0].originalname, stream, {contentLength: size});
    console.log(result.url);
    res.json({
    	error:0,
    	desc:"",
    	data: [result.url]
    })
  }).catch(function (err) {
    console.log(err);
  });

})

// 上传文章内容
router.post("/weixin/commitArcticle",function(req,res){
	var title = req.body.title;
	var imgList = req.body.imgList;
	var type = req.body.type;
	var content = req.body.content;



	// 生成插入语句
	var query = "INSERT INTO `arcticle`(`arc_type` , `arc_title` , `arc_img` , `arc_content` ) VALUES('" + type + "','" + title + "','" + imgList + "','" + content + "')";

	var data = {
		error:"1",
		desc:"",
		data:""
	};

	connection.query(query,"",function(err,queryData){
		console.log("数据库返回的消息是" + queryData);
		// if (err) {
		// 	console.log(err);
		// 	data.error = "-1";
		// 	data.desc = "系统异常";
		// 	data.data = "";
		// }else if (queryData[0] == undefined) {
		// 	data.error = 1;
		// 	data.desc = "数据获取错误,请重新登录";
		// 	data.data = "";
		// }
		// else {
		// 	if (queryData[0].user_id == userId) {
		// 		data.error = 0;
		// 		data.desc = "success";
		// 		data.data = {
		// 			nickName: queryData[0].nick_name,
		// 			power: queryData[0].power
		// 		}
		// 	};
		// };
		res.json(data);
	});
});

// 获取文章列表
router.post("/weixin/arcticleList",function(req,res){
	var userId = req.body.userId;
	// 判断是否有权限拉取信息
	var query = "SELECT user_id FROM `user` WHERE `user_id` = " + userId;
	// 返回消息模板
	
	connection.query(query,"",function(err,queryData){
		if (queryData[0].user_id == userId) {
			// 查询数据
			console.log("文章列表查询---权限判断通过");
			var list = "SELECT * FROM `arcticle`";
			connection.query(list,"",function(error,listData){
				var arcticleList = [];
				for (var i = 0; i < listData.length; i++) {
					if (listData[i].arc_public) {
						var status = "已发布";
					}else {
						var status = "未发布";
					}
					var k = {
						arcticleId: listData[i].arc_id,
						type: listData[i].arc_type,
						public: listData[i].arc_public,
						status:status,
						title: listData[i].arc_title
					};
					arcticleList.push(k);
				};
				var data = {
					error: 0,
					desc: "操作成功",
					data: arcticleList
				};
				res.json(data);
			});
		}else {
			var data = {
				error: 1,
				desc: "没有足够的权限执行该操作",
				data: ""
			};
			res.json(data);
		};
		
	});
});

// 获取文章详情
router.post("/weixin/arcticleDetail",function(req,res){
	var userId = req.body.userId;
	var arcticleId = req.body.arcticleId;
	// 判断是否有权限拉取信息
	var query = "SELECT user_id FROM `user` WHERE `user_id` = " + userId;
	// 返回消息模板
	
	connection.query(query,"",function(err,queryData){
		if (queryData[0].user_id == userId) {
			// 查询数据
			console.log("查询文章详情---权限判断通过");
			var list = "SELECT * FROM `arcticle` WHERE `arc_id` = " + arcticleId;
			connection.query(list,"",function(error,listData){

				var imgList = listData[0].arc_img.split(",");
				var k = {
					title: listData[0].arc_title,
					content: listData[0].arc_content,
					imgList: imgList,
				}
				var data = {
					error: 0,
					desc: "操作成功",
					data: k
				};
				res.json(data);
			});
		}else {
			data.desc = "当前没有足够的权限执行该操作";
			var data = {
				error: 1,
				desc: "没有足够的权限执行该操作",
				data: ""
			};
			res.json(data);
		};
		
	});
});




//注册
router.post("/houxia/register",function(req,res){
	var account = req.body.account;
	var password = req.body.password;
	var query = "SELECT * FROM user WHERE account = " + req.body.account + " And password = " + req.body.password;
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){
		console.log(queryData);
		// 服务器错误
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
		}else
		if (queryData[0].account == account) {
			console.log("账号已被注册");
			data.error = 1;
			data.desc = "该账号已被注册";
			data.data = "";
		}else
		if (queryData[0] == undefined || queryData == []) {
			console.log("用户注册操作");
			var insert = "insert into user values('','" + account + "','" + password + "','','');";
			connection.query(insert,"",function(insertErr,insertData){
				console.log(insertData);
				if (insertData) {
					data.error = 0;
					data.desc = "账号注册成功";
					data.data = "";
				}
			});
		}
		res.json(data);
	});

});



module.exports = router;
