import imageModelGet from "./commands/image/model/get.ts";
import imageModelReset from "./commands/image/model/reset.ts";
import imageModelSelect from "./commands/image/model/select.ts";
import imageModelSet from "./commands/image/model/set.ts";
import image from "./commands/image/reindex.ts";

export default [image, imageModelGet, imageModelSet, imageModelSelect, imageModelReset];
