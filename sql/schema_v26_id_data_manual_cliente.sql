-- ============================================================
-- ATUALIZAÇÃO 26 — ID E DATA DE CADASTRO MANUAIS NO CLIENTE
-- Rode isso depois da Atualização 25.
-- ============================================================

-- tira o preenchimento automático do código — agora é você quem escolhe
alter table clientes alter column codigo drop default;
alter table clientes add constraint clientes_codigo_unico unique (codigo);

-- data de cadastro que você escolhe (diferente do "criado em" do banco,
-- que continua existindo por baixo dos panos pra auditoria)
alter table clientes add column if not exists data_cadastro date default current_date;
