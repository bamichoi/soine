import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConceptDto } from './concept.dto';

async function validateInput(input: Record<string, unknown>) {
  const dto = plainToInstance(ConceptDto, input);
  const errors = await validate(dto, { forbidNonWhitelisted: true, whitelist: true });
  return { dto, properties: errors.map((error) => error.property) };
}

describe('ConceptDto', () => {
  it('trims components and drops empty items', async () => {
    const { dto, properties } = await validateInput({
      components: ['  상차림 테이블 ', '', '   ', '떡 모형'],
      name: ' 한복 클래식 ',
      price: 250000,
    });

    expect(properties).toEqual([]);
    expect(dto.name).toBe('한복 클래식');
    expect(dto.components).toEqual(['상차림 테이블', '떡 모형']);
  });

  it('requires a name and a whole, non-negative price', async () => {
    const { properties } = await validateInput({ name: '  ', price: -1 });
    const fraction = await validateInput({ name: '컨셉', price: 1.5 });

    expect(properties).toEqual(expect.arrayContaining(['name', 'price']));
    expect(fraction.properties).toContain('price');
  });

  it('rejects components that are not a list of strings or too long', async () => {
    const notList = await validateInput({ components: '상차림', name: '컨셉', price: 1 });
    const tooLong = await validateInput({ components: ['가'.repeat(201)], name: '컨셉', price: 1 });

    expect(notList.properties).toContain('components');
    expect(tooLong.properties).toContain('components');
  });
});
