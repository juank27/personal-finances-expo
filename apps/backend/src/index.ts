import { app } from "./app";
import { config } from "./config";

app.listen(config.PORT, () => {
  console.log(`Backend listening on http://localhost:${config.PORT}`);
});
