'use strict';

/* eslint-disable no-underscore-dangle */

const url = require('url');
const passport = require('passport');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const signUserOut = (req, res) => {
  if (req.user.id_token) {
    logger.audit('User logged out', {
      type: 'Sign-out',
      userId: req.user.sub,
      email: req.user.email,
      client: 'services',
    });
    const idToken = req.user.id_token;
    const issuer = passport._strategies.oidc._issuer;
    let returnUrl;
    if (req.query.redirected === 'true' && !req.query.redirect_uri) {
      returnUrl = `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/signout/complete`;
    } else if (req.query.redirected === 'true' && req.query.redirect_uri) {
      returnUrl = req.query.redirect_uri
    } else {
      returnUrl = `${config.hostingEnvironment.profileUrl}/signout`
    }
    req.logout();
    res.redirect(url.format(Object.assign(url.parse(issuer.end_session_endpoint), {
      search: null,
      query: {
        id_token_hint: idToken,
        post_logout_redirect_uri: returnUrl,
      },
    })));
  } else {
    res.redirect('/');
  }
};

module.exports = signUserOut;

