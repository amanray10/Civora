// Google OAuth + email/password (bcrypt) + JWT
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let sign = (u) =>
  jwt.sign({ id: u.id, role: u.role, departmentId: u.departmentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

let publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, picture: u.picture,
  role: u.role, departmentId: u.departmentId
});

// POST /api/auth/google  { credential }
exports.googleLogin = async (req,res) => {
  let {credential} = req.body;

  try{
    let ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    let {sub, name, email, picture} = ticket.getPayload();

    let user = await prisma.user.findUnique({ where: { email: email } });
    user = user
      ? await prisma.user.update({ where: { id: user.id }, data: { googleId: sub, picture: picture, name: name } })
      : await prisma.user.create({ data: { googleId: sub, name: name, email: email, picture: picture } });

    console.log("google login:", user.id);
    res.json({token: sign(user), user: publicUser(user)});

  } catch (err){
    console.log(err);
    res.status(401).json({error: "Google sign-in failed. Try again."});
  }
};

// POST /api/auth/register  { name, email, password }
exports.register = async (req,res) => {
  let {name, email, password} = req.body;
  if (!name || !email || !password || password.length < 6){
    return res.status(400).json({error: "Name, email and a 6+ character password are required."});
  }

  try{
    let exists = await prisma.user.findUnique({ where: { email: email } });
    if (exists) return res.status(409).json({error: "An account with this email already exists."});

    let user = await prisma.user.create({
      data: { name: name, email: email, password: await bcrypt.hash(password, 10) }
    });

    console.log("registered:", user.id);
    res.status(201).json({token: sign(user), user: publicUser(user)});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while registering."});
  }
};

// POST /api/auth/login  { email, password }
exports.login = async (req,res) => {
  let {email, password} = req.body;

  try{
    let user = await prisma.user.findUnique({ where: { email: email } });
    if (!user || !user.password || !(await bcrypt.compare(password || '', user.password))){
      return res.status(401).json({error: "Incorrect email or password."});
    }

    console.log("login:", user.id);
    res.json({token: sign(user), user: publicUser(user)});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while logging in."});
  }
};

// GET /api/auth/me
exports.me = async (req,res) => {
  try{
    let user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({error: "Account not found."});

    res.json({user: publicUser(user)});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching account."});
  }
};
