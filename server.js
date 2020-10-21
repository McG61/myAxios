// 简单搭建服务，配合测试
const express = require('express');
let app = express();
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});
app.get('/getMethod', function(req, res){
    let data = {
        success: true,
        method: 'GET',
        name: 'Joseph',
        family: '摩根家族',
    };
    // res.statusCode = 300;
    setTimeout(() => res.json(data), 2000);
});
app.post('/postMethod', function(req, res){
    let data = {
        success: true,
        method: 'POST',
        name: 'Juniors',
        family: '摩根家族',
    };
    res.send(data);
});
app.listen(3001, 'localhost', () => {
    console.log('监听3001');
});