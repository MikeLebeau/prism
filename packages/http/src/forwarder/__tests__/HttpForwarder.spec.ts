import { httpOperations, httpRequests } from '@stoplight/prism-http/__tests__/fixtures';
import { HttpForwarder } from '@stoplight/prism-http/forwarder/HttpForwarder';
import * as axios from 'axios';

describe('HttpForwarder', () => {
  const forwarder = new HttpForwarder();

  beforeEach(() => {
    jest.spyOn(axios, 'default').mockImplementation(jest.fn);
  });

  describe('forward()', () => {
    describe('parameters are invalid', () => {
      it('throws error when resource is missing', async () => {
        return expect(
          forwarder.forward({ input: httpRequests[0] })
        ).rejects.toThrowErrorMatchingSnapshot();
      });

      it('throws error when server list is missing', async () => {
        return expect(
          forwarder.forward({
            resource: Object.assign({}, httpOperations[0], { servers: undefined }),
            input: httpRequests[0],
          })
        ).rejects.toThrowErrorMatchingSnapshot();
      });

      it('throws error when server list is empty', async () => {
        return expect(
          forwarder.forward({
            resource: Object.assign({}, httpOperations[0], { servers: [] }),
            input: httpRequests[0],
          })
        ).rejects.toThrowErrorMatchingSnapshot();
      });
    });

    describe('parameters are valid', () => {
      describe('server url has no variables', () => {
        it('proxies request correctly', async () => {
          jest.spyOn(axios, 'default').mockImplementation(() => ({
            status: 200,
            headers: {
              'Content-type': 'application/json',
            },
            data: '[{},{}]',
            statusText: 'ok',
          }));

          const response = await forwarder.forward({
            input: httpRequests[0],
            resource: Object.assign({}, httpOperations[0], {
              servers: [{ url: 'http://api.example.com' }],
            }),
          });

          expect(response).toMatchSnapshot();

          expect(axios.default).toHaveBeenCalledWith({
            method: 'get',
            url: 'http://api.example.com/todos',
            responseType: 'text',
            validateStatus: expect.any(Function),
          });
        });
      });

      describe('server url has variables', () => {
        it('fails when variable is not defined', async () => {
          return expect(
            forwarder.forward({
              input: httpRequests[0],
              resource: Object.assign({}, httpOperations[0], {
                servers: [
                  {
                    url: 'http://{var1}.example.com',
                    variables: {
                      var2: {},
                    },
                  },
                ],
              }),
            })
          ).rejects.toThrowErrorMatchingSnapshot();
        });

        it('substitutes url with default variable values', async () => {
          await forwarder.forward({
            input: httpRequests[0],
            resource: Object.assign({}, httpOperations[0], {
              servers: [
                {
                  url: 'http://{var1}.example.com',
                  variables: {
                    var1: {
                      default: 'api',
                    },
                  },
                },
              ],
            }),
          });

          expect(axios.default).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'http://api.example.com/todos' })
          );
        });

        it('substitutes url with first variable value if there is no default one', async () => {
          await forwarder.forward({
            input: httpRequests[0],
            resource: Object.assign({}, httpOperations[0], {
              servers: [
                {
                  url: 'http://{var1}.example.com',
                  variables: {
                    var1: {
                      enum: ['api', 'api2'],
                    },
                  },
                },
              ],
            }),
          });

          expect(axios.default).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'http://api.example.com/todos' })
          );
        });
      });
    });
  });
});
