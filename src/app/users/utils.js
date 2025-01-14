'use strict';
const { getById } = require('./../../infrastructure/search');
const { mapUserStatus } = require('./../../infrastructure/utils');
const {
  getServicesForUser,
  getServicesForInvitation,
  getSingleUserService,
  getSingleInvitationService,
} = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const sortBy = require('lodash/sortBy');

const getUserDetails = async (req) => {
  const uid = req.params.uid;
  const user = await getById(uid, req.id);
  const organisationDetails = user.organisations.find((x) => x.id === req.params.orgId);
  return {
    id: uid,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: mapUserStatus(user.statusId),
    organisation: organisationDetails,
    lastLogin: user.lastLogin,
    deactivated: user.statusId === -2,
  };
};

const getAllServicesForUserInOrg = async (userId, organisationId, correlationId) => {
  const allUserServices = userId.startsWith('inv-')
    ? await getServicesForInvitation(userId.substr(4), correlationId)
    : await getServicesForUser(userId, correlationId);
  if (!allUserServices) {
    return [];
  }

  const userServicesForOrg = allUserServices.filter((x) => x.organisationId === organisationId);
  const services = userServicesForOrg.map((service) => ({
    id: service.serviceId,
    dateActivated: service.accessGrantedOn,
    name: '',
    status: null,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const application = await getApplication(service.id);
    service.name = application.name;
    service.status = mapUserStatus(service.status);
  }
  return sortBy(services, 'name');
};

const getSingleServiceForUser = async (userId, organisationId, serviceId, correlationId) => {
  const userService = userId.startsWith('inv-')
    ? await getSingleInvitationService(userId.substr(4), serviceId, organisationId, correlationId)
    : await getSingleUserService(userId, serviceId, organisationId, correlationId);
  const application = await getApplication(userService.serviceId);
  return {
    id: userService.serviceId,
    roles: userService.roles,
    name: application.name,
  };
};

const delay = async (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const waitForIndexToUpdate = async (uid, updatedCheck) => {
  const abandonTime = Date.now() + 10000;
  let hasBeenUpdated = false;
  while (!hasBeenUpdated && Date.now() < abandonTime) {
    const updated = await getById(uid);
    if (updatedCheck) {
      hasBeenUpdated = updatedCheck(updated);
    } else {
      hasBeenUpdated = updated;
    }
    if (!hasBeenUpdated) {
      await delay(200);
    }
  }
};

module.exports = {
  getUserDetails,
  getAllServicesForUserInOrg,
  getSingleServiceForUser,
  waitForIndexToUpdate,
};
