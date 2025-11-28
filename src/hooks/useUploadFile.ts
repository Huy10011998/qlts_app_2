import { uploadAttachProperty } from "../services/data/CallApi";

export const useUploadFile = () => {
  const uploadFile = async (file: any, nameClass: any, idClass: any) => {
    return uploadAttachProperty({ file, nameClass, idClass });
  };

  return { uploadFile };
};
