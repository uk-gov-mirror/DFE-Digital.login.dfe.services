const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
    access: {
      type: 'static',
    },
    search: {
      type: 'static',
    },
    applications: {
      type: 'static',
    },
  };
});

jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    removeServiceFromUser: jest.fn(),
    removeServiceFromInvitation: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/logger', () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    audit: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');

const logger = require('./../../../../src/infrastructure/logger');
const { getUserDetails, getSingleServiceForUser } = require('./../../../../src/app/users/utils');
const { removeServiceFromInvitation, removeServiceFromUser } = require('./../../../../src/infrastructure/access');

describe('when removing service access', () => {

  let req;
  let res;

  let postRemoveServiceAccess;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1'
    };
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [{
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 0,
          name: 'category name'
        }
      }],
    };
    req.userOrganisations = [{
      organisation: {
        id: 'org1',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    req.body = {
      selectedOrganisation: 'organisationId',
    };

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: 'user1',
      email: 'email@email.com'
    });

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    res = mockResponse();
    postRemoveServiceAccess = require('./../../../../src/app/users/removeServiceAccess').post;
  });


  it('then it should delete service for invitation if request for invitation', async () => {
    req.params.uid = 'inv-invite1';

    await postRemoveServiceAccess(req, res);

    expect(removeServiceFromInvitation.mock.calls).toHaveLength(1);
    expect(removeServiceFromInvitation.mock.calls[0][0]).toBe('invite1');
    expect(removeServiceFromInvitation.mock.calls[0][1]).toBe('service1');
    expect(removeServiceFromInvitation.mock.calls[0][2]).toBe('org1');
    expect(removeServiceFromInvitation.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should delete org for user if request for user', async () => {

    await postRemoveServiceAccess(req, res);

    expect(removeServiceFromUser.mock.calls).toHaveLength(1);
    expect(removeServiceFromUser.mock.calls[0][0]).toBe('user1');
    expect(removeServiceFromUser.mock.calls[0][1]).toBe('service1');
    expect(removeServiceFromUser.mock.calls[0][2]).toBe('org1');
    expect(removeServiceFromUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should should audit service being removed', async () => {
    await postRemoveServiceAccess(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('user.one@unit.test (id: user1) removed service service name for organisation organisationName (id: org1) for user email@email.com (id: user1)');
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-service-deleted',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      editedUser: 'user1',
      editedFields: [
        {
          name: 'remove_service',
          oldValue: 'service1',
          newValue: undefined,
        }
      ],
    });
  });

  it('then it should redirect to user details', async () => {
    await postRemoveServiceAccess(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  });

  it('then a flash message is shown to the user', async () => {
    await postRemoveServiceAccess(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
  });
});