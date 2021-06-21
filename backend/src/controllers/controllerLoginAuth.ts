import jwt_decode from "jwt-decode";

export {};
const bcrypt = require('bcrypt')
const db_sql = require("../models");
const User = db_sql.model.User;
const { createJWT, createRefreshJWT } = require('../modules/jwt');

// Create and Save a new User
exports.create = (req, res) => {
      // Create a User
      const user = {
        email : req.body.email,
        username: req.body.username,
        password: req.body.password,
        role: req.body.role,
      };
    
      // Save User in the database
      User.create(user)
        .then(data => {
          res.send(data);
        })
        .catch(err => {
          res.status(500).send({
            message:
              err.message || "Some error occurred while creating the user."
          });
        });
};

exports.createAccount =async (req, res) => {
  console.log(req.body)
  try {
    const hashedPassword = await bcrypt.hash( req.body.password, 10)
    const user = {
      email : req.body.email,
      username: req.body.username,
      password: hashedPassword,
      role: req.body.role,
    };
    User.create(user)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the user."
      });
    });
  } catch {
    res.status(500).send()
  }
};

exports.loginAccount = async (req, res) => {
  const {email, role, password} = req.body;
  const user = await User.findOne({ where : {email : email, role : role }})
  if(user == null){
      return res.status(400).send('Cannot find user')   
  }
  try {
      if(await bcrypt.compare(password, user.password)){      
          let accessToken = createJWT({ email : email, role : role })
          let refreshToken = await createRefreshToken( email, role );
          res.cookie("accessToken", accessToken, {
            expires: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
            // httpOnly: true,
            // secure: true,
            // sameSite: "strict",
          });
          res.cookie("refreshToken", refreshToken, {
            expires: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
          });
          res.set({accessToken : accessToken}).json({message : 'Vous êtes connecté'})
      }else{
        return res.send('Not Allowed')
      }
  }catch{
    return res.status(500).send()
  }
};

exports.logout = async (req, res ) => {    
  const {email, role} = req.body;
  console.log(email)
  const user = Boolean(Number(await User.update({ refreshToken : null}, {where : {email : email, role: role}})));
  if(!user){
      res.status(400).send('Cannot find user')   
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).send('Logout');
};

// Retrieve all Users from the database.
exports.findAll = (req, res) => {
  User.findAll()
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving users."
      });
    });
};

// Find a single User with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  User.findByPk(id)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: "Error retrieving users with id=" + id
      });
    });
};

// Find me with email
exports.findMe = (req, res) => {
  const email = req.user.email;
  User.findOne({ where : {email : email }})
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: "DOn't find your profil"
      });
    });
};

// Update a User by the id in the request
exports.update = async (req, res) => {
  const email = req.email;
  const user = {
    email : email,
    username: req.body.username,
    role: req.body.role,
  };

  if(req.body.password){
    const hashedPassword = await bcrypt.hash( req.body.password, 10)
    user['password'] = hashedPassword;
  }
  console.log(user)

  User.update(user, {
    where: { email: email }
  })
    .then(num => {
      if (num == 1) {
        res.send({
          message: "User was updated successfully."
        });
      } else {
        res.send({
          message: `Cannot update user with email=${email}. Maybe user was not found or req.body is empty!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating user with email=" + email
      });
    }); 
};

// Update a User by the id in the request
exports.updateParam = (req, res) => {
  const id = req.params.id;

  User.update(req.body, {
    where: { id: id }
  })
    .then(num => {
      if (num == 1) {
        res.send({
          message: "User was updated successfully."
        });
      } else {
        res.send({
          message: `Cannot update user with id=${id}. Maybe user was not found or req.body is empty!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating user with id=" + id
      });
    }); 
};


// Delete a User with the specified id in the request
exports.delete = (req, res) => {
  const {email, role} = req;

  User.destroy({
    where : {email : email, role: role}
  })
    .then(num => {
      if (num == 1) {
        res.send({
          message: "User was deleted successfully!"
        });
      } else {
        res.send({
          message: `Cannot delete User with email=${email}. Maybe User was not found!`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete User with email=" + email
      });
    });
};

// Delete all Users from the database.
exports.deleteAll = (req, res) => {
    User.destroy({
        where: {},
        truncate: false
      })
        .then(nums => {
          res.send({ message: `${nums} Users were deleted successfully!` });
        })
        .catch(err => {
          res.status(500).send({
            message:
              err.message || "Some error occurred while removing all Users."
          });
        });
};

// Find all published Users
exports.findAllPublished = (req, res) => {
    User.findAll({ where: { published: true } })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving users."
      });
    });
};

async function createRefreshToken(email : string, role : string){
  const refreshToken = createRefreshJWT({ email : email, role : role })
  const expiredToken = new Date(new Date().getTime() +  7 * 24 * 60 * 60 * 1000);
  User.update(
      { refreshToken : refreshToken, expiredToken: expiredToken }, 
      { where : { email : email } }
      )
  return refreshToken
}

exports.module = {User: User, db_sql : db_sql};