import styles from './admin-last-login.module.css';

const dateFormat=new Intl.DateTimeFormat('es-CO',{
 timeZone:'America/Bogota',day:'2-digit',month:'short',year:'numeric',
 hour:'2-digit',minute:'2-digit',hour12:true,
});

export function AdminLastLogin({value}:{value?:string|null}){
 const date=value?new Date(value):null;
 const valid=date&&!Number.isNaN(date.getTime());
 return <span className={styles.login}>
  <span>Último inicio de sesión</span>
  {valid?<time dateTime={date.toISOString()} title="Hora de Colombia">{dateFormat.format(date)} · Colombia</time>:<span>Sin registro</span>}
 </span>;
}
