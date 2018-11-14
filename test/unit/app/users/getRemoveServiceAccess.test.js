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

jest.mock('./../../../../src/infrastructure/logger', () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    audit: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');
const { getUserDetails, getSingleServiceForUser } = require('./../../../../src/app/users/utils');

describe('when displaying the remove service access view', () => {

  let req;
  let res;

  let getRemoveService;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
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
        id: 'organisationId',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    res = mockResponse();

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: 'user1',
    });


    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    getRemoveService = require('./../../../../src/app/users/removeServiceAccess').get;
  });

  it('then it should get the users details', async () => {
    await getRemoveService(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
    expect(res.render.mock.calls[0][1].user).toMatchObject({
      id: 'user1',
    });
  });

  it('then it should get the selected user service', async () => {
    await getRemoveService(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe('user1');
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe('org1');
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe('service1');
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should return the confirm remove service view', async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/removeService');
  });

  it('then it should include csrf token', async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the service details', async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: getSingleServiceForUser(),
    });
  });
});