CREATE TABLE `t_chat` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `q_id` int(11) DEFAULT NULL,
  `chat_msg` varchar(200) DEFAULT NULL,
  `chat_date` datetime DEFAULT NULL,
  `chat_user` varchar(20) DEFAULT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_class` (
  `class_name` varchar(20) NOT NULL,
  `password` varchar(20) DEFAULT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_code` (
  `url` varchar(10) NOT NULL,
  `code_type` varchar(4) NOT NULL,
  `code` varchar(10000) DEFAULT NULL,
  `version_no` int(11) DEFAULT '1',
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`url`,`code_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_question` (
  `q_id` int(11) NOT NULL AUTO_INCREMENT,
  `q_content` text,
  `q_date` datetime DEFAULT NULL,
  `q_user` varchar(20) DEFAULT NULL,
  `q_ss_id` int(11) DEFAULT NULL,
  `t_user` varchar(20) DEFAULT NULL,
  `t_bgn_date` datetime DEFAULT NULL,
  `t_end_date` datetime DEFAULT NULL,
  `t_end_ss_id` int(11) DEFAULT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`q_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_ss` (
  `ss_id` int(11) NOT NULL,
  `code_type` varchar(4) NOT NULL,
  `code` varchar(10000) DEFAULT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ss_id`,`code_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_ss_id` (
  `ss_id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(10) NOT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ss_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_url` (
  `url` varchar(10) NOT NULL,
  `comment` varchar(200) DEFAULT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_url_class` (
  `url` varchar(10) NOT NULL,
  `class_name` varchar(20) NOT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`url`, `class_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_url_user` (
  `url` varchar(10) NOT NULL,
  `user_name` varchar(20) NOT NULL,
  `ins_date` datetime DEFAULT NULL,
  `ins_user` varchar(20) DEFAULT NULL,
  `upd_date` datetime DEFAULT NULL,
  `upd_user` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`url`, `user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `t_image` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `ins_user` varchar(20) NOT NULL,
  `ins_date` datetime DEFAULT NULL,
  `file_name` varchar(45) NOT NULL,
  `path` varchar(45) NOT NULL,
  PRIMARY KEY (`image_id`),
  UNIQUE KEY `path_name_uq` (`path`,`file_name`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8;




