'use strict';
const logger = require('./../../infrastructure/logger');
const { getUserDetails, getSingleServiceForUser } = require('./utils');
const { listRolesOfService, updateUserService, updateInvitationService } = require ('./../../infrastructure/access');

const getSelectedRoles = async (req) => {
  let selectedRoleIds = req.session.service.roles;
  const allRolesOfService = await listRolesOfService(req.params.sid, req.id);
  let roleDetails;

  if (selectedRoleIds && !Array.isArray(selectedRoleIds)) {
    selectedRoleIds = [selectedRoleIds];
  }
  if (selectedRoleIds) {
    roleDetails = allRolesOfService.filter(x => selectedRoleIds.find(y=> y.toLowerCase() === x.id.toLowerCase()));
  } else  {
    roleDetails = [];
    selectedRoleIds = [];
  }
  return {
    roleDetails,
    selectedRoleIds,
  };
};

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const selectedRoles = await getSelectedRoles(req);
  return res.render('users/views/confirmEditService', {
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    currentPage: 'users',
    backLink: 'edit-service',
    user,
    roles: selectedRoles.roleDetails,
    service: userService,
  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const serviceId = req.params.sid;
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);
  const selectedRoles = await getSelectedRoles(req);
  if(uid.startsWith('inv-')) {
    await updateInvitationService(uid.substr(4), serviceId, organisationId, selectedRoles.selectedRoleIds, req.id);
  } else {
    await updateUserService(uid, serviceId, organisationId, selectedRoles.selectedRoleIds, req.id);
  }

  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const org = organisationDetails[0].organisation.name;
  logger.audit(`${req.user.email} (id: ${req.user.sub}) updated service ${service.name} for organisation ${org} (id: ${organisationId}) for user ${user.email} (id: ${uid})`, {
    type: 'approver',
    subType: 'user-service-updated',
    userId: req.user.sub,
    userEmail: req.user.email,
    editedUser: uid,
    editedFields: [{
      name: 'update_service',
      newValue: selectedRoles.selectedRoleIds,
    }],
  });

  res.flash('info', `${service.name} updated successfully`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};