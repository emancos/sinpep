import { PassThrough } from 'stream';
import { StorageController } from './storage.controller';

describe('StorageController', () => {
  it('sanitiza Content-Disposition para nomes em português/acentos e define Content-Type padrão', async () => {
    const mockStream = new PassThrough();
    const storageServiceMock = {
      getFileStream: jest.fn(async () => ({
        stream: mockStream,
        mimeType: undefined,
        name: 'Exame Crânio "João"\n.pdf',
      })),
    };

    const controller = new StorageController(storageServiceMock as any);
    const headersSet: Record<string, string> = {};
    const mockRes: any = {
      set: jest.fn((headers: Record<string, string>) => {
        Object.assign(headersSet, headers);
      }),
    };
    const pipeSpy = jest.spyOn(mockStream, 'pipe').mockReturnValue(mockRes);

    await controller.getFile('file-1', mockRes);

    expect(storageServiceMock.getFileStream).toHaveBeenCalledWith('file-1');
    expect(headersSet['Content-Type']).toBe('application/octet-stream');
    expect(headersSet['Content-Disposition']).toContain('inline; filename="Exame Cr_nio _Jo_o__.pdf"');
    expect(headersSet['Content-Disposition']).toContain("filename*=UTF-8''Exame%20Cr%C3%A2nio%20_Jo%C3%A3o__.pdf");
    expect(pipeSpy).toHaveBeenCalledWith(mockRes);
  });
});
