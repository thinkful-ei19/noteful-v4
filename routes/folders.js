'use strict';

const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const Folder = require('../models/folder');
const Note = require('../models/note');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/folders', (req, res, next) => {
  const userId = req.user.id;

  Folder.find({userId: userId})
    .sort('name')
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/folders/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Folder.findOne({_id: id, userId})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/folders', (req, res, next) => {
  const { name } = req.body;
  const userId = req.user.id;

  const newFolder = { name, userId };

  /***** Never trust users - validate input *****/
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  Folder.create(newFolder)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/folders/:id', (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const updateFolder = { name };



  Folder.findById(id)
    .then((result) => {
      if (result === null) {
        const err = new Error('The `id` does not exist.');
        err.status = 404;
        return next(err);
      }
      if (String(result.userId) === String(userId)) {
        Folder.findByIdAndUpdate(id, updateFolder, { new: true })
        .then(result => {
          if (result) {
            res.json(result);
          } else {
            next();
          }
        })
        .catch(err => {
          if (err.code === 11000) {
            err = new Error('The folder name already exists');
            err.status = 400;
          }
          next(err);
        });
      }       
      else {
        const err = new Error('This id does not belong to this user.');
        err.status = 400;
        return next(err);
      }
    })
    .catch((err) => {
      next(err);
    })

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/folders/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  Folder.findById(id)
    .then((result) => {
      if (String(result.userId) === String(userId)) {
        // Manual "cascading" delete to ensure integrity
        const folderRemovePromise = Folder.findByIdAndRemove({ _id: id });  // NOTE **underscore** _id
        // const noteRemovePromise = Note.deleteMany({ folderId: id });

        const noteRemovePromise = Note.updateMany(
          { folderId: id },
          { '$unset': { 'folderId': '' } }
        );

        Promise.all([folderRemovePromise, noteRemovePromise])
          .then(() => {
            res.status(204).end();
          })
          .catch(err => {
            next(err);
          });
      }
      else {
        const err = new Error('This id does not belong to this user.');
        err.status = 400;
        return next(err);
      }
    })


});

module.exports = router;