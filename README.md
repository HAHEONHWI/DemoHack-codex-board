# Post Board

# DemoHack-codex-board

Supabase 인증과 RLS를 사용하는 기본 게시판입니다.

## 구성

- 로그인 / 회원가입
- `admin`, `user` 역할
- User: 글 작성, 본인 글 수정, 본인 글 삭제
- Admin: 계정 생성, 계정 삭제
- Supabase RLS 정책과 Edge Function 포함

## Supabase 설정

1. Supabase 프로젝트를 만든 뒤 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. Supabase Dashboard → Authentication → Providers → Email에서 Confirm email을 끕니다. 그래야 회원가입 직후 이메일 확인 없이 바로 로그인됩니다.
3. 첫 관리자 계정은 Supabase Dashboard의 Authentication에서 직접 만든 뒤, SQL Editor에서 아래처럼 role을 바꿉니다.

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

4. `supabase/functions/admin-users/index.ts`를 Edge Function으로 배포합니다.

```bash
npx supabase functions deploy admin-users
```

이 함수는 공개 회원가입을 이메일 확인 완료 상태로 만들기 위해 `verify_jwt = false`로 설정되어 있습니다. Admin 기능은 함수 내부에서 별도로 JWT와 `admin` role을 확인합니다.

4. `app.js` 상단의 값을 프로젝트 값으로 교체합니다.

```js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

5. 정적 서버로 실행합니다.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`으로 접속하면 됩니다.
