import type { InjectionToken, ModuleMetadata, OptionalFactoryDependency } from '@nestjs/common';

export interface AzureModuleAsyncOptions<TOptions> extends Pick<ModuleMetadata, 'imports'> {
	inject?: Array<InjectionToken | OptionalFactoryDependency>;
	isGlobal?: boolean;
	useFactory: (...dependencies: never[]) => TOptions | Promise<TOptions>;
}
