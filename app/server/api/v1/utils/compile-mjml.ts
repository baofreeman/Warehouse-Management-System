import mjml2html from "mjml";
import fs from "fs";

export const compileMjml = (filePath: string, data: Record<string, string>) => {
  let mjml = fs.readFileSync(filePath, "utf8");
  Object.keys(data).forEach((key) => {
    mjml = mjml.replace(`{{${key}}}`, data[key]);
  });
  return mjml2html(mjml).html;
};
