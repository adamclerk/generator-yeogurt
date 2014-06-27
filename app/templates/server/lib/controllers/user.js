'use strict';

var _ = require('underscore');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/user');
var secrets = require('../config/secrets');

module.exports = {
    /**
     * GET /login
     * Login page.
     */

    getLogin: function(req, res) {
        if (req.user) {
            return res.redirect('/');
        }
        res.render('account/login', {
            title: 'Login'
        });
    },

    /**
     * POST /login
     * Sign in using email and password.
     * @param email
     * @param password
     */

    postLogin: function(req, res, next) {
        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password cannot be blank').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            req.flash('errors', errors);
            return res.redirect('/login');
        }

        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                req.flash('errors', {
                    msg: info.message
                });
                return res.redirect('/login');
            }
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                req.flash('success', {
                    msg: 'Success! You are logged in.'
                });
                res.redirect(req.session.returnTo || '/');
            });
        })(req, res, next);
    },

    /**
     * GET /logout
     * Log out.
     */

    logout: function(req, res) {
        req.logout();
        res.redirect('/');
    },

    /**
     * GET /signup
     * Signup page.
     */

    getSignup: function(req, res) {
        if (req.user) {
            return res.redirect('/');
        }
        res.render('account/signup', {
            title: 'Create Account'
        });
    },

    /**
     * POST /signup
     * Create a new local account.
     * @param email
     * @param password
     */

    postSignup: function(req, res, next) {
        req.assert('email', 'Email is not valid').isEmail();
        req.assert('password', 'Password must be at least 4 characters long').len(4);
        req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

        var errors = req.validationErrors();

        if (errors) {
            req.flash('errors', errors);
            return res.redirect('/signup');
        }

        var user = new User({
            email: req.body.email,
            password: req.body.password
        });

        user.save(function(err) {
            if (err) {
                if (err.code === 11000) {
                    req.flash('errors', {
                        msg: 'User with that email already exists.'
                    });
                }
                return res.redirect('/signup');
            }
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    },

    /**
     * GET /account
     * Profile page.
     */

    getAccount: function(req, res) {
        res.render('account/profile', {
            title: 'Account Management'
        });
    },

    /**
     * POST /account/profile
     * Update profile information.
     */

    postUpdateProfile: function(req, res, next) {
        User.findById(req.user.id, function(err, user) {
            if (err) {
                return next(err);
            }
            user.email = req.body.email || '';
            user.profile.name = req.body.name || '';
            user.profile.gender = req.body.gender || '';
            user.profile.location = req.body.location || '';
            user.profile.website = req.body.website || '';

            user.save(function(err) {
                if (err) {
                    return next(err);
                }
                req.flash('success', {
                    msg: 'Profile information updated.'
                });
                res.redirect('/account');
            });
        });
    },

    /**
     * POST /account/password
     * Update current password.
     * @param password
     */

    postUpdatePassword: function(req, res, next) {
        req.assert('password', 'Password must be at least 4 characters long').len(4);
        req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

        var errors = req.validationErrors();

        if (errors) {
            req.flash('errors', errors);
            return res.redirect('/account');
        }

        User.findById(req.user.id, function(err, user) {
            if (err) {
                return next(err);
            }

            user.password = req.body.password;

            user.save(function(err) {
                if (err) {
                    return next(err);
                }
                req.flash('success', {
                    msg: 'Password has been changed.'
                });
                res.redirect('/account');
            });
        });
    },

    /**
     * POST /account/delete
     * Delete user account.
     * @param id - User ObjectId
     */

    postDeleteAccount: function(req, res, next) {
        User.remove({
            _id: req.user.id
        }, function(err) {
            if (err) {
                return next(err);
            }
            req.logout();
            res.redirect('/');
        });
    },

    /**
     * GET /account/unlink/:provider
     * Unlink OAuth2 provider from the current user.
     * @param provider
     * @param id - User ObjectId
     */

    getOauthUnlink: function(req, res, next) {
        var provider = req.params.provider;
        User.findById(req.user.id, function(err, user) {
            if (err) {
                return next(err);
            }

            user[provider] = undefined;
            user.tokens = _.reject(user.tokens, function(token) {
                {
                    return token.kind === provider;
                }
            });

            user.save(function(err) {
                if (err) {
                    return next(err);
                }
                req.flash('info', {
                    msg: provider + ' account has been unlinked.'
                });
                res.redirect('/account');
            });
        });
    },

    /**
     * GET /reset/:token
     * Reset Password page.
     */

    getReset: function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }

        User
            .findOne({
                resetPasswordToken: req.params.token
            })
            .where('resetPasswordExpires').gt(Date.now())
            .exec(function(err, user) {
                if (!user) {
                    req.flash('errors', {
                        msg: 'Password reset token is invalid or has expired.'
                    });
                    return res.redirect('/forgot');
                }
                res.render('account/reset', {
                    title: 'Password Reset'
                });
            });
    },

    /**
     * POST /reset/:token
     * Process the reset password request.
     */

    postReset: function(req, res, next) {
        req.assert('password', 'Password must be at least 4 characters long.').len(4);
        req.assert('confirm', 'Passwords must match.').equals(req.body.password);

        var errors = req.validationErrors();

        if (errors) {
            req.flash('errors', errors);
            return res.redirect('back');
        }

        async.waterfall([

            function(done) {
                User
                    .findOne({
                        resetPasswordToken: req.params.token
                    })
                    .where('resetPasswordExpires').gt(Date.now())
                    .exec(function(err, user) {
                        if (!user) {
                            req.flash('errors', {
                                msg: 'Password reset token is invalid or has expired.'
                            });
                            return res.redirect('back');
                        }

                        user.password = req.body.password;
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function(err) {
                            if (err) {
                                return next(err);
                            }
                            req.logIn(user, function(err) {
                                done(err, user);
                            });
                        });
                    });
            },
            function(user, done) {
                var smtpTransport = nodemailer.createTransport('SMTP', {
                    service: 'Mandrill',
                    auth: {
                        user: secrets.mandrill.login,
                        pass: secrets.mandrill.password
                    }
                });
                var mailOptions = {
                    to: user.email,
                    from: 'no-reply@beamforge.com',
                    subject: 'Your BeamForge password has been changed',
                    text: 'Hello,\n\n' +
                        'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
                };
                smtpTransport.sendMail(mailOptions, function(err) {
                    req.flash('success', {
                        msg: 'Success! Your password has been changed.'
                    });
                    done(err);
                });
            }
        ], function(err) {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    },

    /**
     * GET /forgot
     * Forgot Password page.
     */

    getForgot: function(req, res) {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }
        res.render('account/forgot', {
            title: 'Forgot Password'
        });
    },

    /**
     * POST /forgot
     * Create a random token, then the send user an email with a reset link.
     * @param email
     */

    postForgot: function(req, res, next) {
        req.assert('email', 'Please enter a valid email address.').isEmail();

        var errors = req.validationErrors();

        if (errors) {
            req.flash('errors', errors);
            return res.redirect('/forgot');
        }

        async.waterfall([

            function(done) {
                crypto.randomBytes(16, function(err, buf) {
                    var token = buf.toString('hex');
                    done(err, token);
                });
            },
            function(token, done) {
                User.findOne({
                    email: req.body.email.toLowerCase()
                }, function(err, user) {
                    if (!user) {
                        req.flash('errors', {
                            msg: 'No account with that email address exists.'
                        });
                        return res.redirect('/forgot');
                    }

                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                    user.save(function(err) {
                        done(err, token, user);
                    });
                });
            },
            function(token, user, done) {
                var smtpTransport = nodemailer.createTransport('SMTP', {
                    service: 'Mandrill',
                    auth: {
                        user: secrets.mandrill.login,
                        pass: secrets.mandrill.password
                    }
                });
                var mailOptions = {
                    to: user.email,
                    from: 'no-reply@beamforge.com',
                    subject: 'Reset your password on Beamforge',
                    text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                };
                smtpTransport.sendMail(mailOptions, function(err) {
                    req.flash('info', {
                        msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.'
                    });
                    done(err, 'done');
                });
            }
        ], function(err) {
            if (err) {
                return next(err);
            }
            res.redirect('/forgot');
        });
    }
};