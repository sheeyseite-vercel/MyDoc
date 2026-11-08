-- شغّله في SQL Editor بعد وجود مستخدمين وثائق لهما. استبدل المعرفين.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"USER_A_UUID"}', true);
-- يجب أن تكون النتيجة 0: المستخدم A لا يرى وثائق B
select count(*) as leaked from documents where user_id = 'USER_B_UUID';
rollback;
