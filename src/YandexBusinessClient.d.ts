export interface OrganizationData {
    name?: string;
    category?: string;
    phones?: string[];
    website?: string;
    description?: string;
    address?: string;
    hours?: string;
    socials?: {
        vk?: string;
        telegram?: string;
        instagram?: string;
    };
}
export declare class YandexBusinessClient {
    private orgId;
    private storageStatePath;
    private browser?;
    private context?;
    constructor(orgId: string, storageStatePath?: string);
    private getPage;
    close(): Promise<void>;
    updateBasicInfo(data: OrganizationData): Promise<void>;
    updatePhotos(photoPaths: string[]): Promise<void>;
}
//# sourceMappingURL=YandexBusinessClient.d.ts.map