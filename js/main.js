// JavaScript Document
// From Moeyou.com

/*   主要内容  */
function time(){
    t = document.getElementById('time');
   var now=new Date();
   var year = now.getFullYear();
   if (year<1700){
	   document.write();
	   }
   var month=(now.getMonth()+1);
   if (month<10){
	   month = '0'+month;
	   }
	var date=now.getDate();
	if(date<10){
		date = '0'+date;
		}
	var hours=now.getHours();
	if(hours<10){
		hours = '0'+hours;
		}
	var minutes =now.getMinutes();
	if(minutes<10){
		minutes='0'+minutes;
		}
	var seconds = now.getSeconds();
	if (seconds<10){
		seconds= '0'+seconds;
		}
    //替换div内容
   t.innerHTML = "" + year +"年"+ month +"月"+ date +"日"+
                 " " + hours+":"+ minutes +":"+ seconds+" ";
    //等待一秒钟后调用time方法，由于settimeout在time方法内，所以可以无限调用
   setTimeout(time,1000);
  }
  /*   主要内容结束  */
