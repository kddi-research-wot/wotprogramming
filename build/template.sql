insert into t_code
values
     ( '000'
     , 'html'
	 , '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="js/task.js"></script>
  <script src="js/webgpio.js"></script>
  <script src="js/webi2c.js"></script>
</head>
<body>

</body>
</html>
'
	 , 0
	 , now(), 'template', now(), 'template');

insert into t_code
values
     ( '000'
     , 'css'
	 , ''
	 , 0
	 , now(), 'template', now(), 'template');

insert into t_code
values
     ( '000'
     , 'js'
	 , ''
	 , 0
	 , now(), 'template', now(), 'template');

insert into t_url
(url,
comment)
values
     ( 'login'
	 , '禁止ワード');

insert into t_url
(url,
comment)
values
     ( 'logout'
	 , '禁止ワード');

insert into t_url
(url,
comment)
values
     ( 'tutor'
	 , '禁止ワード');

insert into t_url
(url,
comment)
values
     ( 'auth'
	 , '禁止ワード');
