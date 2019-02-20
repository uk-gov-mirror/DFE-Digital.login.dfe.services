'use strict';

const config = require('./../config');
const {getServicesForUser, getSingleUserService} = require('../../infrastructure/access');
const { getOrganisationAndServiceForUser } = require('./../organisations');
const APPROVER = 10000;

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.isLoggedIn = true;
    return next();
  }
  req.session.redirectUrl = req.originalUrl;
  return res.status(302).redirect('/auth');
};

const isApprover = (req, res, next) => {
  if (req.userOrganisations) {
    const userApproverOrgs = req.userOrganisations.filter(x => x.role.id === 10000);
    if (userApproverOrgs.find(x => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase())) {
      return next();
    }
  }
  return res.status(401).render('errors/views/notAuthorised');
};

/*const setApproverContext = async (req, res, next) => {
  res.locals.isApprover = false;
  if (req.user) {
    const user = req.user;
    const services = await getServicesForUser(user.sub);
    res.locals.isApprover = services.some(s => s.role.id >= APPROVER && s.status > 0);
  }
  next();
};*/

const getUserEmail = user => user.email || '';

const getUserDisplayName = user => `${user.given_name || ''} ${user.family_name || ''}`.trim();

const setUserContext = async (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    res.locals.displayName = getUserDisplayName(req.user);
    const organisations = await getOrganisationAndServiceForUser(req.user.sub, req.id);
    req.userOrganisations = organisations;
    try {
      if (req.userOrganisations) {
        res.locals.isApprover = req.userOrganisations.filter(x => x.role.id === 10000).length > 0
      }
    } catch (e) {
      return e;
    }

    const isManageUser = await getSingleUserService(req.user.sub, config.access.identifiers.service, config.access.identifiers.organisation,  req.id);
    if (isManageUser && isManageUser.roles.length > 0) {
      res.locals.isManageUser = true;
    }
  }
  next();
};

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

const setConfigContext = (req, res, next) => {
  res.locals.profilesUrl = config.hostingEnvironment.profileUrl;
  next();
};

const mapUserStatus = (status, changedOn = null) => {
  // TODO: use userStatusMap
  if (status === -2) {
    return { id: -2, description: 'Deactivated Invitation', changedOn };
  }
  if (status === -1) {
    return { id: -1, description: 'Invited', changedOn };
  }
  if (status === 0) {
    return { id: 0, description: 'Deactivated', changedOn };
  }
  return { id: 1, description: 'Active', changedOn };
};


module.exports = {
  isLoggedIn,
  getUserEmail,
  getUserDisplayName,
  setUserContext,
  asyncMiddleware,
  setConfigContext,
  isApprover,
  mapUserStatus,
};
