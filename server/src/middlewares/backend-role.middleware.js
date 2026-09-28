import { checkAdmin } from '../modules/cms/middleware.mjs';
import { BACKEND_MIN_ROLE } from '../../../shared/roles.js';

// 콘텐츠를 고치는 API 를 백엔드와 같은 기준(manager 이상)으로 막는다.
// 로그인은 웹 앱과 같은 omb-access-token 쿠키/Bearer 토큰을 쓴다.
export async function requireBackendRole(req, res, next) {
  try {
    const result = await checkAdmin(req, BACKEND_MIN_ROLE);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, message: result.message });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
