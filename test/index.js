const { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { env } = require('./env')

const main = async () => {
  const S3 = new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  const buckRes = await S3.send(new ListBucketsCommand({}));
  const [bucket] = buckRes["Buckets"];
  const bucketName = bucket["Name"];
  const folderName = "test";
  const fileName = `test.png`;

  // 上传图片
  //   const imagesRes = await fetch("https://picsum.photos/id/237/200/300");
  //   const contentType = imagesRes.headers.get("content-type");
  //   const imageBuffer = await imagesRes.arrayBuffer();
  //   const objectList = await S3.send(new PutObjectCommand({
  //     Bucket: bucketName,
  //     Body: imageBuffer,
  //     Key: `${folderName}/${fileName}`,
  //     ContentType: contentType,
  //   }));
  //   console.log("upload test: ", objectList);

  // 删除图片
  /* const delRes = await S3.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: `${folderName}/${fileName}`,
  }));
  console.log("del test:", delRes); */
};
main();
