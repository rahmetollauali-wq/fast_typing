import { Router } from "express";
import * as textService from "../../services/textService.js";
import { handle } from "../handler.js";

const router = Router();

// GET /api/texts/random?mode=classic&language=en&difficulty=medium&option=30&exclude=12
router.get("/random", handle(async (req, res) => {
  const { mode = "classic", language = "en", difficulty = "medium", option, exclude } = req.query;
  res.json(await textService.getTextForTest({
    mode,
    language,
    difficulty,
    option: option ? Number(option) : null,
    excludeId: exclude ? Number(exclude) : null,
  }));
}));

export default router;
