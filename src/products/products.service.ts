import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { NotFoundError } from 'rxjs';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);

      return product;
    } catch (err) {
      this.handleDbExceptions(err);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit = 5, offset = 0 } = paginationDto;

      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
      });

      return products;
    } catch (err) {
      this.handleDbExceptions(err);
    }
  }

  async findOne(term: string) {
    try {
      let product: Product[];
      if (isUUID(term)) {
        product = await this.productRepository.findBy({ id: term });
      } else {
        product = await this.productRepository.findBy({ slug: term });
      }

      if (product.length === 0) {
        throw new Error(`No existe producto con el id: ${term}`);
      }
      return product;
    } catch (err) {
      this.handleDbExceptions(err);
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product = await this.productRepository.preload({
        id,
        ...updateProductDto,
      });
      if (!product) throw new NotFoundException('No existe el producto ');

      await this.productRepository.save(product);
      return product;
    } catch (err) {
      this.handleDbExceptions(err);
    }
  }

  async remove(id: string) {
    try {
      const deletedProduct = await this.productRepository.delete(id);

      if (deletedProduct.affected === 0) {
        throw new Error(`No existe producto con el id: ${id}`);
      } else {
        return `Producto con id: ${id} borrado correctamente`;
      }
    } catch (err) {
      this.handleDbExceptions(err);
    }
  }

  private handleDbExceptions(err: any) {
    if (err.code === '23505') {
      this.logger.error(err);
      throw new BadRequestException(err.detail);
    } else {
      throw err;
    }
  }
}
