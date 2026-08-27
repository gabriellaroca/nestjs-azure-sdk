import { Inject } from '@nestjs/common';
import { BLOB_SERVICE_CLIENT } from './blob-storage.constants.js';

export const InjectBlobServiceClient = (): ParameterDecorator => Inject(BLOB_SERVICE_CLIENT);
