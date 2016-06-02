var express = require('express');
var router = express.Router();

var quizController = require('../controllers/quiz_controller');
var commentController = require('../controllers/comment_controller');
var userController = require('../controllers/user_controller');
var sessionController = require('../controllers/session_controller')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/author', function(req, res, next){
	res.render('author');
});

// Autoload de rutas que usen :quizId
router.param('quizId', quizController.load);
router.param('userId', userController.load);

// Definicion de rutas de sesion
router.get('/session',		sessionController.new);
router.post('/session',		sessionController.create);
router.delete('/session', 	sessionController.destroy);

// Definicion de rutas de cuenta

router.get('/users',									userController.index);
router.get('/users/:userId(\\d+)',						userController.show);
router.get('/users/new',								userController.new);
router.post('/users',									userController.create);
router.get('/users/:userId(\\d+)/edit',					sessionController.loginRequired, userController.edit);
router.put('/users/:userId(\\d+)',						sessionController.loginRequired, userController.update);
router.delete('/users/:userId(\\d+)',					sessionController.loginRequired, userController.destroy);

// Definición de rutas /quizzes

router.get('/quizzes.:format?',							quizController.index);
router.get('/quizzes/:quizId(\\d+).:format?',			quizController.show);
router.get('/quizzes/:quizId(\\d+)/check',				quizController.check);
router.get('/quizzes/new',								sessionController.loginRequired, quizController.new);
router.post('/quizzes',									sessionController.loginRequired, quizController.create);
router.get('/quizzes/:quizId(\\d+)/edit',				sessionController.loginRequired, quizController.edit);
router.put('/quizzes/:quizId(\\d+)',					sessionController.loginRequired, quizController.update);
router.delete('/quizzes/:quizId(\\d+)',					sessionController.loginRequired, quizController.destroy);

router.get('/quizzes/:quizId(\\d+)/comments/new',		sessionController.loginRequired, commentController.new);
router.post('/quizzes/:quizId(\\d+)/comments',			sessionController.loginRequired, commentController.create);

module.exports = router;
