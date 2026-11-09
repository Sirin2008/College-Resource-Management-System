require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { auth, allow } = require('./middleware');

const app = express();
app.use(cors());
app.use(express.json());

const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const tokenFor = user => jwt.sign(
  { id:user.id, username:user.username, full_name:user.full_name, role:user.role },
  process.env.JWT_SECRET || 'dev_secret_change_me', { expiresIn:'12h' }
);

app.get('/', (req,res) => res.json({ message:'College Resource Management API is running' }));
app.get('/api/health', asyncRoute(async (req,res) => {
  await db.query('SELECT 1');
  res.json({ status:'ok', database:'connected' });
}));

app.post('/api/auth/register', asyncRoute(async (req,res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({message:'Enter name, username and password.'});
  if (String(password).length < 6) return res.status(400).json({message:'Password must contain at least 6 characters.'});
  // Public registration is student-only. Admin assigns faculty/admin roles.
  const hash = await bcrypt.hash(password, 10);
  try {
    const [r] = await db.query('INSERT INTO users(username,password_hash,full_name,role) VALUES(?,?,?,?)',
      [username.trim(),hash,full_name.trim(),'student']);
    res.status(201).json({message:'Registration successful. You can log in now.', id:r.insertId});
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({message:'Username already exists.'});
    throw e;
  }
}));
app.post('/api/auth/login', asyncRoute(async (req,res) => {
  const { username,password } = req.body;
  const [rows] = await db.query('SELECT * FROM users WHERE username=?',[username]);
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash)))
    return res.status(401).json({message:'Incorrect username or password.'});
  const u=rows[0]; const user={id:u.id,username:u.username,full_name:u.full_name,role:u.role};
  res.json({token:tokenFor(user),user});
}));
app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/api/resources',auth,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT * FROM resources WHERE active=1 ORDER BY resource_code');
  res.json(rows);
}));
app.post('/api/resources',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const {resource_code,resource_name,resource_type,location,capacity}=req.body;
  const [r]=await db.query('INSERT INTO resources(resource_code,resource_name,resource_type,location,capacity) VALUES(?,?,?,?,?)',
    [resource_code,resource_name,resource_type||'Computer Lab',location||'',Number(capacity)||30]);
  res.status(201).json({id:r.insertId,message:'Resource added.'});
}));
app.put('/api/resources/:id',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const {resource_name,resource_type,location,capacity,active}=req.body;
  await db.query('UPDATE resources SET resource_name=?,resource_type=?,location=?,capacity=?,active=? WHERE id=?',
    [resource_name,resource_type,location||'',Number(capacity)||30,active===false?0:1,req.params.id]);
  res.json({message:'Resource updated.'});
}));
app.delete('/api/resources/:id',auth,allow('admin'),asyncRoute(async(req,res)=>{
  await db.query('UPDATE resources SET active=0 WHERE id=?',[req.params.id]); res.json({message:'Resource disabled.'});
}));

app.get('/api/periods',auth,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT * FROM periods ORDER BY period_no'); res.json(rows);
}));
app.get('/api/timetable',auth,asyncRoute(async(req,res)=>{
  const {day}=req.query;
  let sql=`SELECT t.*,r.resource_code,r.resource_name,p.label,p.start_time,p.end_time
    FROM timetable t JOIN resources r ON r.id=t.resource_id JOIN periods p ON p.period_no=t.period_no`;
  const args=[];
  if(day){sql+=' WHERE t.day_name=?';args.push(day);}
  sql+=' ORDER BY FIELD(t.day_name,"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"),p.period_no,r.resource_code';
  const [rows]=await db.query(sql,args); res.json(rows);
}));
app.post('/api/timetable',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const {resource_id,day_name,period_no,class_name,notes}=req.body;
  await db.query(`INSERT INTO timetable(resource_id,day_name,period_no,class_name,notes) VALUES(?,?,?,?,?)
    ON DUPLICATE KEY UPDATE class_name=VALUES(class_name),notes=VALUES(notes)`,
    [resource_id,day_name,period_no,class_name||'',notes||'']);
  res.json({message:'Timetable synchronized.'});
}));
app.delete('/api/timetable/:id',auth,allow('admin'),asyncRoute(async(req,res)=>{
  await db.query('DELETE FROM timetable WHERE id=?',[req.params.id]);res.json({message:'Timetable entry removed.'});
}));

app.get('/api/bookings/mine',auth,asyncRoute(async(req,res)=>{
  const [rows]=await db.query(`SELECT b.*,r.resource_code,r.resource_name,p.label,p.start_time,p.end_time,u.full_name
    FROM bookings b JOIN resources r ON r.id=b.resource_id JOIN periods p ON p.period_no=b.period_no
    JOIN users u ON u.id=b.user_id WHERE b.user_id=? ORDER BY b.booking_date DESC,b.period_no`,[req.user.id]);
  res.json(rows);
}));
app.get('/api/bookings/all',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const [rows]=await db.query(`SELECT b.*,r.resource_code,r.resource_name,p.label,p.start_time,p.end_time,u.full_name,u.role
    FROM bookings b JOIN resources r ON r.id=b.resource_id JOIN periods p ON p.period_no=b.period_no
    JOIN users u ON u.id=b.user_id ORDER BY b.booking_date DESC,b.period_no`);
  res.json(rows);
}));
app.post('/api/bookings',auth,allow('student','faculty'),asyncRoute(async(req,res)=>{
  const {resource_id,booking_date,period_no,purpose}=req.body;
  if(!resource_id||!booking_date||!period_no) return res.status(400).json({message:'Select resource, date and period.'});
  const [conflicts]=await db.query(`SELECT id FROM bookings WHERE resource_id=? AND booking_date=? AND period_no=? AND status='Booked'`,
    [resource_id,booking_date,period_no]);
  if(conflicts.length) return res.status(409).json({message:'This resource is already booked for that date and period.'});
  const [r]=await db.query('INSERT INTO bookings(resource_id,user_id,booking_date,period_no,purpose) VALUES(?,?,?,?,?)',
    [resource_id,req.user.id,booking_date,period_no,purpose||'']);
  res.status(201).json({message:'Booking confirmed.',id:r.insertId});
}));

app.post('/api/bookings/:id/cancel',auth,allow('faculty'),asyncRoute(async(req,res)=>{
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.query(`SELECT b.*,r.resource_code,p.label,p.start_time,p.end_time
      FROM bookings b JOIN resources r ON r.id=b.resource_id JOIN periods p ON p.period_no=b.period_no
      WHERE b.id=? FOR UPDATE`,[req.params.id]);
    if(!rows.length){await conn.rollback();return res.status(404).json({message:'Booking not found.'});}
    const b=rows[0];
    if(b.user_id!==req.user.id){await conn.rollback();return res.status(403).json({message:'You can cancel only your own booking.'});}
    if(b.status!=='Booked'){await conn.rollback();return res.status(400).json({message:'This booking is already cancelled.'});}
    await conn.query("UPDATE bookings SET status='Cancelled',cancelled_at=NOW() WHERE id=?",[b.id]);
    const msg=`Faculty ${req.user.full_name} cancelled ${b.resource_code} on ${b.booking_date}, ${b.label} (${String(b.start_time).slice(0,5)}-${String(b.end_time).slice(0,5)}). The resource is now available for booking.`;
    // Notify all students, all other faculty, and admins.
    await conn.query(`INSERT INTO notifications(user_id,title,message)
      SELECT id,'Lab period available',? FROM users WHERE id<>? AND role IN ('student','faculty','admin')`,
      [msg,req.user.id]);
    await conn.commit();
    res.json({message:'Period cancelled. Students and other faculty have been notified.',available:true});
  } catch(e){await conn.rollback();throw e;}
  finally{conn.release();}
}));

app.get('/api/notifications',auth,asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',[req.user.id]);res.json(rows);
}));
app.patch('/api/notifications/:id/read',auth,asyncRoute(async(req,res)=>{
  await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',[req.params.id,req.user.id]);res.json({message:'Marked as read.'});
}));
app.get('/api/users',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const [rows]=await db.query('SELECT id,username,full_name,role,created_at FROM users ORDER BY role,full_name');res.json(rows);
}));
app.patch('/api/users/:id/role',auth,allow('admin'),asyncRoute(async(req,res)=>{
  const {role}=req.body;
  if(!['student','faculty','admin'].includes(role)) return res.status(400).json({message:'Invalid role.'});
  await db.query('UPDATE users SET role=? WHERE id=?',[role,req.params.id]);res.json({message:'Role updated.'});
}));

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(500).json({message:err.code==='ER_NO_SUCH_TABLE'?'Database tables are missing. Run database/schema.sql.':'Server error. Check backend terminal and .env settings.'});
});
const port=process.env.PORT||5000;
app.listen(port,()=>console.log(`Backend running on http://127.0.0.1:${port}`));
