// Conexion con base de datos
var mysql = require('mysql');
//Clasificador bayesiano
var bayes = require('node-bayes');
var i = 0;

var TRAINING_COLUMNS = ['mesReserva', 'mesVuelo', 'tickets', 'destino'];
var TRAINING_DATA = [
['Marzo', 'Octubre', '1', 'Poznan'],
['Mayo', 'Julio', '4', 'Londres'],
['Abril', 'Mayo', '3', 'Barcelona'],
['Noviembre', 'Febrero', '2', 'París'],
['Enero', 'Febrero', '2', 'Roma'],
['Febrero', 'Octubre', '1', 'Bangkok'],
['Septiembre', 'Enero', '2', 'Dubái'],
['mesReserva', 'mesVuelo', '1', 'Tokio'],
['mesReserva', 'mesVuelo', '5', 'Seúl'],
['mesReserva', 'mesVuelo', '2', 'Nueva York'],
['mesReserva', 'Enero', '5', 'Kuala Lumpur'],
['mesReserva', 'mesVuelo', '5', 'Hong Kong'],
['mesReserva', 'Marzo', '2', 'Estambul'],
['mesReserva', 'mesVuelo', '5', 'Ámsterdam'],
['mesReserva', 'mesVuelo', '3', 'Milán'],
['mesReserva', 'mesVuelo', '1', 'Taipei'],
['mesReserva', 'mesVuelo', '1', 'Shanghai'],
['mesReserva', 'mesVuelo', '3', 'Viena'],
['mesReserva', 'mesVuelo', '3', 'Praga'],
['mesReserva', 'mesVuelo', '4', 'Miami'],
['mesReserva', 'mesVuelo', '1', 'Dublín'],
['mesReserva', 'mesVuelo', '3', 'Munich'],
['mesReserva', 'Septiembre', '1', 'Toronto'],
['Junio', 'Agosto', '5', 'Berlín'],
['mesReserva', 'mesVuelo', '4', 'Johannesburgo'],
['mesReserva', 'mesVuelo', '3', 'Los Angeles']
];

var connection = mysql.createConnection({ 
   host: 'localhost',
   user: 'root',
   password: '',
   database: 'airbot',
});

function startConnection(){
    connection.connect(function(error){
   if(error){
      throw error;
   }else{
      console.log('Conexion correcta con con base de datos');
   }
});
}


//Consultas bd
function insertarUsuarioBD(id){
	
   connection.query('SELECT COUNT(*) as usersCount FROM usuarios WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   if(rows[0].usersCount < 1){
			    connection.query('INSERT INTO usuarios(id) VALUES(?)', [id], function(error, result){
				   if(error){
					  throw error;
				   }else{
					  console.log('ID introducido correctamente.');
				   }
			})
		   } else{
			   console.log('El ID ya está dado de alta en la BD.');
		   }
	   }
   });
}

var flight = function consultaVueloByOrigenDestino(origen,destino,callback){
    var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yyyy = today.getFullYear();
	
	if(dd<10) {
		dd='0'+dd
	} 

	if(mm<10) {
		mm='0'+mm
	} 
	today = yyyy+'/'+mm+'/'+dd;
	
	connection.query('SELECT * FROM vuelos WHERE origen=? and destino=? and fecha>? and plazas > 0', [origen,destino,today],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		  callback(null, rows[0]);
	   }
	});
}

function confirmBooking(vuelo, idUser, nTickets,reminder){
	var hora = new Date();
	hora = hora.getHours()+":"+hora.getMinutes();
	
	//Insert en reservas
	connection.query('INSERT INTO reservas(id,idvueloida,idvueloretorno,idusuario,fechareserva,horareserva,npersonas,expirado)'+
					 'VALUES(?,?,?,?,?,?,?,?)', [null,vuelo.id,null,idUser,vuelo.fecha,hora,nTickets,0], function(error, result){
		if(error){
			throw error;
		}else{
			nPlazas = vuelo.plazas - 1;
			connection.query('UPDATE vuelos SET plazas=? WHERE id=?',[nPlazas,vuelo.id], function(error, result){
				if(error){
					  throw error;
				   }else{
					  console.log('Actualizado nº de plazas del vuelo ' + vuelo.id);
				   }
			});
			console.log('Reserva realizada correctamente.');
			if(reminder > 0){
				connection.query('SELECT r.id FROM reservas r WHERE idusuario=? and fechareserva=? and horareserva=?', [idUser,vuelo.fecha,hora],function(err, rows, fields){
					if (err){
						throw err;
					}else{
						vuelo.fecha.setDate(vuelo.fecha.getDate() - reminder);
						var fecha = vuelo.fecha;
						idR = rows[0].id
						connection.query('INSERT INTO recordatorios(idreserva,idusuario,fechaRecordatorio,numeroDias)'+
										 'VALUES(?,?,?,?)',[idR, idUser, fecha, reminder],function(error,result){
								if(error){
									throw error;
								} else {
									console.log("Recordatorio actualizado");		 
								}
											 
						});
					}
				});
			}
		}
	})
}

var consultFlight = function consultaVuelo(id,callback){
	connection.query('SELECT * FROM vuelos WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		    callback(null, rows[0]);
	   }
	});
}

var consultBooking = function consultaReserva(id,callback){
	
	connection.query('SELECT * FROM reservas WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows[0]);
	   }
	});
}

var consultReservasbyUser = function queryReservasbyUser(id, callback){
   connection.query('SELECT r.npersonas, v.origen, v.destino, v.fecha, v.hora, v.precio FROM `reservas` as r INNER JOIN `vuelos` as v on v.id = r.idvueloida WHERE idusuario=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
            callback(null, rows);
	   }
   });
}

var reminders = function reminders(id, callback){
	
	connection.query('SELECT * FROM recordatorios WHERE idusuario=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var consReminder = function consReminder(idR, idU, callback){
	
	connection.query('SELECT * FROM recordatorios WHERE idreserva=? and idusuario=?', [idR,idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var modifyReminder = function modifyReminder(idR, idU, date, days, callback){

	date.setDate(date.getDate() - days);
	var fecha = date;
	connection.query('UPDATE recordatorios SET fechaRecordatorio=?,numeroDias=? WHERE idreserva=? and idusuario=?', [fecha,days,idR,idU],function(err, rows, fields){
		   if (err){
			   throw err;
		   }else{
			   callback(null, rows);
		   }
	});
}

var consultDateReminder=function consultDateReminder(idR, idU, callback){
	connection.query('SELECT fechaRecordatorio FROM recordatorios WHERE idreserva=? and idusuario=?', [idR,idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var consultaOrigenTipico = function consultaOrigenTipico(idU, callback){
    connection.query('SELECT MAX(origen) as origenComun FROM reservas INNER JOIN vuelos on reservas.idvueloida = vuelos.id WHERE idusuario=?', [idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

/*
Funcion de predicción de destino a partir de:
- de mes en el que estamos
- de fecha en la que mas suele viajar el usuario
- numero de billetes que mas suele reservar el usuario
*/
var predictDestino = function predictDestino(callback, mesact, mesdestino, ticketscomun){
    // Numeric attributes
var cls = new bayes.NaiveBayes({
  columns: TRAINING_COLUMNS,
  data: TRAINING_DATA,
  verbose: true
});
cls.train();
var answer = cls.predict([mesact, mesdestino, ticketscomun]);
console.log(answer);
}




//exports.consultaVueloByOrigenDestino=consultaVueloByOrigenDestino;
exports.connection=connection;
exports.startConnection=startConnection;
exports.insertarUsuarioBD=insertarUsuarioBD;
exports.consultFlight=consultFlight;
exports.consultBooking=consultBooking;
exports.confirmBooking=confirmBooking;
exports.flight = flight;
exports.consultReservasbyUser=consultReservasbyUser;
exports.consReminder=consReminder;
exports.reminders=reminders;
exports.modifyReminder=modifyReminder;
exports.consultDateReminder=consultDateReminder;
exports.consultaOrigenTipico = consultaOrigenTipico;