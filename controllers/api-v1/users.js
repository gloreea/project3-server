const router = require('express').Router()
const db = require('../../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authLockedRoute = require('./authLockedRoute')


// GET /users - test endpoint
router.get('/', (req, res) => {
	res.json({ msg: 'welcome to the users endpoint' })
})

// POST /users/register - CREATE new user
router.post('/register', async (req, res) => {
	try {
		// check if user exists already
		const findUser = await db.User.findOne({
			email: req.body.email
		})

		// don't allow emails to register twice
		if (findUser) {
			return res.status(400).json({ msg: 'email exists already' })
		}

		// hash password
		const password = req.body.password
		const saltRounds = 12
		const hashedPassword = await bcrypt.hash(password, saltRounds)

		// create new user
		const newUser = new db.User({
			name: req.body.name,
			email: req.body.email,
			password: hashedPassword
		})

		await newUser.save()

		// create jwt payload
		const payload = {
			name: newUser.name,
			email: newUser.email,
			_id: newUser.id,
			score: newUser.score
		}

		// sign jwt and send back
		const token = jwt.sign(payload, process.env.JWT_SECRET)

		res.json({ token })
	} catch (error) {
		console.log(error)
		res.status(500).json({ msg: 'server error' })
	}
})

// POST /users/login -- validate login credentials
router.post('/login', async (req, res) => {
	try {
		// try to find user in the db
		const foundUser = await db.User.findOne({
			email: req.body.email
		})

		const noLoginMessage = 'Incorrect username or password'

		// if the user is not found in the db, return and sent a status of 400 with a message
		if (!foundUser) {
			return res.status(400).json({ msg: noLoginMessage })
		}

		// check the password from the req body against the password in the database
		const matchPasswords = bcrypt.compare(req.body.password, foundUser.password)

		// if provided password does not match, return an send a status of 400 with a message
		if (!matchPasswords) {
			return res.status(400).json({ msg: noLoginMessage })
		}

		// create jwt payload
		const payload = {
			name: foundUser.name,
			email: foundUser.email,
			_id: foundUser.id,
			score: foundUser.score
		}

		// sign jwt and send back
		const token = jwt.sign(payload, process.env.JWT_SECRET)

		res.json({ token })
	} catch (error) {
		console.log(error)
		res.status(500).json({ msg: 'server error' })
	}
})

// PUT /users/profile -- update a user's profile
router.put('/profile', authLockedRoute, async (req, res) => {
	try {
		const { email, password } = req.body;
		const userId = res.locals.user._id; 
	
		// Find user in the db
		const user = await db.User.findById(userId);
		if (!user) {
		  return res.status(404).json({ error: 'User not found' });
		}
	
		// Update the user's email and password
		user.email = email;

		// has the new password before updating
		const saltRounds = 12
		const hashedPassword = await bcrypt.hash(password, saltRounds)
		user.password = hashedPassword;

		await user.save();
	
		res.json({ message: 'User email and password updated successfully', user: user });
	  } catch (err) {
		console.error(err);
		res.status(500).json({ msg: 'server error' });
	  }
})

// GET -- get the user's score
router.get('/update-score/:id', async (req, res) => {
	try {
		const { id } = req.params
		const user = await db.User.findById(id)

		if (!user) {
			return res.status(404).json({ msg: 'user not found' })
		}

		res.json({ msg: 'score fetched successfully', user })
	} catch (err) {
		console.warn(err)
		res.status(500).json({ msg: 'server error updating score' })
	}
})

// PUT -- updates user's score
router.put('/update-score/:id', async (req, res) => {
	try {
		const { id } = req.params
		const user = await db.User.findById(id)

		if (!user) {
			return res.status(404).json({ msg: 'user not found' })
		}

		const points = req.body.points || 0
		user.score += points
		await user.save()

		res.json({ msg: 'score updated successfully', user })
	} catch (err) {
		console.warn(err)
		res.status(500).json({ msg: 'server error updating score' })
	}
})

// GET /auth-locked - will redirect if bad jwt token is found
router.get('/auth-locked', authLockedRoute, (req, res) => {
	// use res.locals.user here to do authorization stuff
	console.log('logged in user:', res.locals.user)
	res.json({ msg: 'welcome to the private route!' })
})

module.exports = router
