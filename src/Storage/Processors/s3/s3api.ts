// Adapted apiS3.ts from nostrmeet.me
// FIXME env depends on being run inside svelte 
import { PutObjectCommand, GetObjectCommand, S3Client, ListObjectsCommand, type GetObjectCommandOutput, type PutObjectCommandOutput, type ListObjectsCommandOutput, S3ClientConfig } from '@aws-sdk/client-s3';
import { s3secrets, StorageFileList } from '../../../types';

export type S3FileList = {
  Key : string, 
  filenames : string[]
  nextKey? : string, 
}

export interface S3ObjectInput {
  Bucket : string, // The path to the directory you want to upload the object to, starting with your Space name.
}
export interface S3GetObjectInput extends S3ObjectInput{
  Key : string, // Object key, referenced whenever you want to access this file later.
}
export interface S3PutObjectInput extends S3GetObjectInput {
  Body : any, // The object's contents. This variable is an object, not a string.
  ACL : "private" | "public-read" | "public-read-write" | "authenticated-read" | "aws-exec-read" | "bucket-owner-read" | "bucket-owner-full-control", // Defines ACL permissions, such as private or public.
  Expires? : Date, // unix timestamp
  Metadata? : {} // Defines metadata tags.
}
export interface S3ListObjectsInput extends S3ObjectInput {
  Marker? : string, // Marker is the "Key" where you want to start listing from.
  MaxKeys? : number, // maximum number of keys returned in the response.
  Prefix? : string; // Limits the response to keys that begin with the specified prefix.
}

export class s3 {
    static init(secrets: s3secrets) {
      s3.config = {
        forcePathStyle: false, // Configures to use subdomain/virtual calling format.
        region: secrets.region, // Must be "us-east-1" when creating new Spaces. Otherwise, use the region in your endpoint (for example, nyc3).
        endpoint: secrets.endpoint, // Find your endpoint in the control panel, under Settings. Prepend "https://".
        credentials: {
            accessKeyId: secrets.key, // Access key pair. You can create access key pairs using the control panel or API.
            secretAccessKey: secrets.secret // Secret access key defined through an environment variable.
        }
      }
      s3.bucket = secrets.bucket
    }
    private static config : S3ClientConfig
    private static bucket : string
    private static _client: S3Client | undefined;

    private static get client(){
      if(s3._client){
        return s3._client 
      }else if(s3.config){
        s3._client = new S3Client( s3.config as any)
        return s3._client
      }else{
        throw('missing credentals required for s3 client');
      }
    }

    private static async send (op:'get', objectinput:S3ObjectInput) : Promise<GetObjectCommandOutput | undefined> 
    private static async send (op:'put', objectinput:S3ObjectInput) : Promise<PutObjectCommandOutput | undefined> 
    private static async send (op:'list', objectinput:S3ObjectInput) : Promise<ListObjectsCommandOutput | undefined> 
    private static async send (op:'get' | 'put' | 'list', objectinput:S3ObjectInput) : Promise<GetObjectCommandOutput | PutObjectCommandOutput | ListObjectsCommandOutput | undefined>  {
      let data : GetObjectCommandOutput | PutObjectCommandOutput | ListObjectsCommandOutput | undefined;
      let path : string
      try {
        // let command : GetObjectCommand | PutObjectCommand | ListObjectsCommand;
        switch(op){
          case 'get' : 
            if("Key" in objectinput) 
            path = objectinput.Key as string
            data = await s3.client.send(new GetObjectCommand(objectinput as S3GetObjectInput)) as GetObjectCommandOutput
            break;
          case 'put' : 
            if("Key" in objectinput && "Body" in objectinput) 
            path = objectinput.Key as string
            data = await s3.client.send(new PutObjectCommand(objectinput as S3PutObjectInput)) as PutObjectCommandOutput
            break;
          case 'list' : 
            if("Marker" in objectinput || "Prefix" in objectinput)
            path = "Marker" in objectinput ? objectinput.Marker as string : objectinput.Prefix as string
            data = await s3.client.send(new ListObjectsCommand(objectinput as S3ListObjectsInput)) as ListObjectsCommandOutput
            break;
          default : throw('invalid command requested');
        }
        if(!data) throw('no data returned') 
        console.log("Success s3.send('"+op+"') to : " +  path);
        // console.log("s3.send() response : ", data);
      } catch (err) {
        console.log("WARNING s3.send('"+op+"') request failed: ", path, err);
        // console.log("s3.send('"+op+"') input : ", objectinput);
        // console.log("s3.send('"+op+"') response : ", data);
        // throw('s3.send() request failed');
      }
      return data;
    }

    static async get(Key : string){
        try{
            if(!s3.bucket) throw('s3 Bucket not specified')
            let input:S3GetObjectInput = { Bucket:s3.bucket, Key }
            // console.log('s3.get('+type+','+userid+','+objid+') calling s3.send() : ',input);
            return  await s3.send('get',input).then(async output => {
              let getoutput = output as GetObjectCommandOutput | undefined;
              if(!getoutput) throw('not found')
              console.log('s3.get() output recieved from s3.send()')
              return JSON.parse(await getoutput?.Body?.transformToString()) //Api.verify(JSON.parse(apievent));
            })
        }catch(e){
            console.log('unable to get data from storage : ',Key,e);
            return undefined;
        }
    }

    // validate data BEFORE sending to s3.put()
    static async put(Key : string, data : any, overwrite = false){
      let input : S3PutObjectInput | undefined;
      try{
        if(!s3.bucket) throw('s3 Bucket not specified')
          // confirm allowed overwrite
        if(!overwrite){
          let existing : boolean = await this.get(Key).then(data => {
            try{
              return data === undefined ? false : true ;
            }catch{
              return false;
            }
          });
          if(existing) throw('overwrite is not permitted')
        }
        // send to storage
        input = {
            Bucket:s3.bucket, Key,
            Body : JSON.stringify(data),
            ACL : "private", 
            Metadata : {}
        }
        // console.log('s3.put() recieved apievent : ',apievent);
        // console.log('s3,put() passing command input to s3.send() : ',input);
        return  await s3.send('put',input).then(() => true ).catch(() => false)
      }catch(e){
        console.log('unable to put data to storage : ', Key,e)
        // console.log('InputObject : ',input)
        return false;
      }
    }

    /**
     * Returns S3FileList
     * containing a`filenames` array of items found.
     * if `nextKey` is a string, use its value to get more items 
     * @param type 
     * @param userid 
     * @returns s3ListObjectOutput {IsTruncated : boolean, Keys : string[]}
     */
    static async list(Key: string) : Promise<StorageFileList | undefined>{
      let input : S3ListObjectsInput | undefined;
      let output : StorageFileList;
      try{
        if(!s3.bucket) throw('s3 Bucket not specified')
          if(!Key.endsWith('/')) Key = Key + '/';
        let filenames : string[] = [];
        input = {
            Bucket : s3.bucket, 
            Marker : Key, 
            Prefix : Key, 
        }
        output =  await s3.send('list',input).then(s3 => {
          let s3output = s3 as ListObjectsCommandOutput | undefined;
          if(!s3output) throw('not found')
          if(!s3output.Contents) throw('no list content');
          let objid : string, next : string | undefined;
          console.log('s3.list() found ', s3output.Contents.length, ' files matching :', Key);
          s3output.Contents.forEach((obj)=>{
            if("Key" in obj && typeof(obj.Key) == 'string') {
              // console.log('s3.list() file :  ', obj.Key);
              objid = (obj.Key as string).replace(Key,'').replace('.json','');
              filenames.push(objid)
              if(!s3output?.IsTruncated) next = objid;
            }
          });
          return {next, list : filenames};
        })
        return output;
      }catch(e){
        // log details to server
        console.log('unable to list data in storage : ', Key, e);
        // console.log('InputObject : ',input)
        return undefined;
      }
  }
}
