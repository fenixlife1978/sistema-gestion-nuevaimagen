const {parseBody,turso,rowsFrom,verify,getCookie,modernHash}=require('../../lib/auth');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const se=verify(getCookie(req,'erp_session')); if(!se||!['J','A'].includes(se.rol))return res.status(403).json({error:'Se requiere autorización J/A'});
 const b=parseBody(req); if(String(b.confirm||'')!=='VACIAR_SISTEMA')return res.status(400).json({error:'Confirmación requerida'});
 try{
  const actor=rowsFrom(await turso([{q:'SELECT id,usuario,rol,activo FROM usuarios WHERE id=? LIMIT 1',params:[se.uid]}]))[0];
  if(!actor||Number(actor.activo)!==1||actor.usuario!==se.usuario||actor.rol!==se.rol||!['J','A'].includes(actor.rol))return res.status(403).json({error:'La sesión administrativa ya no está autorizada'});
  // El reinicio limpia los datos operativos, pero nunca elimina el padrón CNE
  // ni los centros importados: ambos son datos maestros persistentes.
  const tables=['comite_problemas','mesa_maquina_historial','mesa_miembros','cortes_electorales','verificaciones_votacion','actas_mesa','mesa_operativa','autorizaciones_duplicidad_persona','comite_vecinal','direccion_ejecutiva','centro_cargos','asignaciones','reclutadores','actividad'];
  for(const t of tables)await turso([{q:'DELETE FROM '+t}]);
  await turso([{q:'DELETE FROM usuarios WHERE id != ?',params:[actor.id]}]);
  await turso([{q:'INSERT INTO actividad(tipo,texto,usuario_id) VALUES(?,?,?)',params:['sys','Sistema reiniciado por usuario #'+actor.id+'; padrón CNE y centros conservados; cuenta autorizante preservada',actor.id]}]);
  return res.json({ok:true,padron_preservado:true,centros_preservados:true,admin_preservado:true});
 }catch(e){console.error(e);return res.status(500).json({error:e.message||'No se pudo reiniciar el sistema'});}
};